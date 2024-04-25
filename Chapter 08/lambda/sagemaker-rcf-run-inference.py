#!/usr/bin/env python3
# Derived from https://github.com/aws/amazon-sagemaker-examples/blob/main/introduction_to_amazon_algorithms/random_cut_forest/random_cut_forest.ipynb
#
import boto3
import datetime
import numpy as np
import pandas as pd
import sagemaker
from sagemaker.serializers import CSVSerializer
from sagemaker.deserializers import JSONDeserializer
import tempfile

def handler(event, context):
    print("event", event)
    print("context", context)

    for record in event["Records"]:
        process_record(record)
       
def process_record(record):
    # input validation
    oldest_event_time = datetime.datetime.now() - datetime.timedelta(minutes=5)
    if (record["eventSource"] != "aws:s3"):
        print("incorrect eventSource")
        return   
    if (record["eventName"] != "ObjectCreated:Put"):
        print("incorrect eventName")
        return
    if (record["eventTime"] < oldest_event_time.isoformat()):
        print("old eventTime:", record["eventTime"], " < ", oldest_event_time.isoformat())
        return
    bucket_name = record["s3"]["bucket"]["name"]
    object_key = record["s3"]["object"]["key"]
    object_key = object_key.replace("+", " ", len(object_key))
    if (bucket_name != "masteringawsserverlessbook-data"):
        print("incorrect bucket")
        return
    if (not object_key.endswith(".csv")):
        print("incorrect file type")
        return
    # download data
    data_filename = tempfile.mkstemp(".csv")[1]
    s3 = boto3.client("s3")
    ssm = boto3.client("ssm")
    print("Downloading", object_key, "from", bucket_name, "to", data_filename)
    s3.download_file(bucket_name, object_key, data_filename)
    downloaded_data = pd.read_csv(data_filename, delimiter=",")
    # random cut forest
    inference_data = downloaded_data.value.to_numpy().reshape(-1, 1)
    run_rcf_inference(
        inference_data,
        downloaded_data,
    )

def run_rcf_inference(ssm_name, inference_data, downloaded_data):
    # vars
    bucket_name = "masteringawsserverlessbook-data"
    role_arn = "arn:aws:iam::{accountId}:role/sagemaker-full-access"
    ssm_prefix = "function-sagemaker-rcf"
    num_samples_per_tree = 365
    num_trees = 100
    max_std = 3
    # get training job
    ssm = boto3.client("ssm")
    endpoint_name = config_name = ssm.get_parameter(
        Name=f"{ssm_prefix}/training",
    )['Parameter']['Value']
    # specify general training job information
    print("Starting RandomCutForest for", endpoint_name)
    print("Using role", role_arn)
    print("Using bucket", bucket_name)    
    try:
        print("Try creating endpoint")
        sagemaker.Session().create_endpoint(endpoint_name, config_name)
    except Exception as exc:
        # proceed, endpoint already exists
        print(exc)
    try:
        print("Run inference")
        rcf_inference = sagemaker.RandomCutForestPredictor(
            endpoint_name,
            serializer=CSVSerializer(),
            deserializer=JSONDeserializer(),
        )
        results = rcf_inference.predict(inference_data)
    except Exception as exc:
        # proceed, ignore error
        print(exc)
    print("Try to deleting endpoint")
    sagemaker.Session().delete_endpoint(endpoint_name)
    if results:
        scores = [datum["score"] for datum in results["scores"]]
        downloaded_data["score"] = pd.Series(scores, index=downloaded_data.index)
        score_mean = downloaded_data["score"].mean()
        score_std = downloaded_data["score"].std()
        score_cutoff = score_mean + max_std * score_std
        anomalies = downloaded_data[downloaded_data["score"] > score_cutoff]
        print("anomalies\n", anomalies)
