#!/usr/bin/env python3
# Derived from https://github.com/aws/amazon-sagemaker-examples/blob/main/introduction_to_amazon_algorithms/random_cut_forest/random_cut_forest.ipynb
#
import boto3
import datetime
import numpy as np
import pandas as pd
import sagemaker
import tempfile

def handler(event, context):
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
    if (object_key != "analytics/auth-callback.csv"):
        print("incorrect file type")
        return
    # download data
    data_filename = tempfile.mkstemp(".csv")[1]
    s3 = boto3.client("s3")
    ssm = boto3.client("ssm")
    s3.download_file(bucket_name, object_key, data_filename)
    downloaded_data = pd.read_csv(data_filename, delimiter=",")
    # random cut forest
    training_data = downloaded_data.value.to_numpy().reshape(-1, 1)
    run_rcf_training(
        "training",
        training_data,
    )

def run_rcf_training(job_name, training_data):
    # vars
    bucket_name = "masteringawsserverlessbook-data"
    role_arn = "arn:aws:iam::{accountId}:role/sagemaker-full-access"
    ssm_prefix = "function-sagemaker-rcf"
    num_samples_per_tree = 365
    num_trees = 100
    data_name = "auth-callback"
    base_job_name = f"{data_name}-{job_name}"
    # specify general training job information
    print("Starting RandomCutForest for", job_name, "using role", role_arn)
    print("Using bucket", bucket_name, "and key prefix", job_name)
    rcf = sagemaker.RandomCutForest(
        base_job_name=base_job_name,
        role=role_arn,
        instance_count=1,
        instance_type="ml.m4.xlarge",
        data_location=f"s3://{bucket_name}/rcf/",
        output_path=f"s3://{bucket_name}/rcf/output",
        num_samples_per_tree=num_samples_per_tree,
        num_trees=num_trees,
    )
    # automatically upload the training data to S3 and run the training job
    rcf.fit(rcf.record_set(training_data))
    ssm = boto3.client("ssm")
    ssm.put_parameter(
        Name=f"{ssm_prefix}/{job_name}",
        Value=rcf.latest_training_job.name,
        Overwrite=True,
    )
    model_name = sagemaker.Session()
        .create_model_from_job(rcf.latest_training_job.name, role=role_arn)
    config_name = sagemaker.Session()
        .create_endpoint_config(model_name, model_name, 1, "ml.m4.xlarge")
