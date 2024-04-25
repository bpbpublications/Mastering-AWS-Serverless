const url = new URL(location.href);
const code = url.searchParams.get('code');
const clientId = '{clientId}';
const redirectUri = `${url.origin}${url.pathname}`;
const cognitoDomain = 'auth.masteringawsserverlessbook.com';
const tokenEndpoint = `https://${cognitoDomain}/oauth2/token`;
const grantType = 'authorization_code';
if (code) {
  try {
    const resp = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=${grantType}&client_id=${clientId}&code=${code}&redirect_uri=${redirectUri}`,
    });
    const data = await resp.json();
    if (typeof data == 'object' && data.access_token) {
      localStorage.setItem('jwt', JSON.stringify(data));
    }
  } catch (e) {
    console.error(e);
    history.replaceState(null, '', url.origin);
    location.href = `${url.origin}/`;
  }
}
history.replaceState(null, '', url.origin);
location.href = `${url.origin}/account/index.html`;