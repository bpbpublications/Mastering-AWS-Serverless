const url = new URL(location.href);
const code = url.searchParams.get('code');
const clientId = '{clientId}';
const redirectUri = `${url.origin}${url.pathname}`;
const cognitoDomain = 'auth.masteringawsserverlessbook.com';
const tokenEndpoint = `https://${cognitoDomain}/oauth2/token`;
const grantType = 'authorization_code';
const analyticsEndpoint = 'https://api.masteringawsserverlessbook.com/analytics/auth-callback';
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
      /* !!!! START OF CHANGES !!!! */
      /* post analytics */
      await fetch(analyticsEndpoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: data.access_token ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }).catch(function(e) {
        console.warn(e);
      });
      /* !!!! END OF CHANGES !!!! */
    }
  } catch (e) {
    console.error(e);
    history.replaceState(null, '', url.origin);
    location.href = `${url.origin}/`;
  }
}
history.replaceState(null, '', url.origin);
location.href = `${url.origin}/account/index.html`;