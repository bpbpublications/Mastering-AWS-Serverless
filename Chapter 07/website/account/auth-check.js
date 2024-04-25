const jwt = localStorage.getItem('jwt');
const url = new URL(location.href);
const cognitoDomain = 'auth.masteringawsserverlessbook.com';
const tokenEndpoint = `https://${cognitoDomain}/oauth2/userInfo`;
let validLogin = false;
document.getElementsByTagName('main')[0].classList
  .add('visually-hidden');;
document.getElementById('is-logged-in').classList
  .add('visually-hidden');
document.getElementById('is-logged-out').classList
  .remove('visually-hidden');
if (jwt) {
  document.getElementsByTagName('main')[0].classList
    .remove('visually-hidden');;
  try {
    const jwtObj = JSON.parse(jwt);
    if (jwtObj.access_token) {
      const resp = await fetch(tokenEndpoint, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            Authorization: `Bearer ${jwtObj.access_token}`,
        },
      });
      if (resp.ok) {
        validLogin = true;
        const data = await resp.json();
        localStorage.setItem('userFirstName', data.given_name);
        document.getElementById('is-logged-in').classList
          .remove('visually-hidden');
        document.getElementById('is-logged-out').classList
          .add('visually-hidden');
      }
    }
  } catch (e) {
    console.error(e);
  }
}
if (!validLogin) {
  history.replaceState(null, '', url.origin);
  location.href = `${url.origin}/logout.html`;
}