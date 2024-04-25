const url = new URL(location.href);
const clientId = '{clientId}';
const cognitoDomain = 'auth.masteringawsserverlessbook.com';
const tokenEndpoint = `https://${cognitoDomain}/oauth2/revoke`;
try {
  const jwt = localStorage.getItem('jwt');
  if (jwt) {
    const jwtObj = JSON.parse(jwt);
    if (jwtObj.refresh_token) {
      await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `token=${jwtObj.refresh_token}&client_id=${clientId}`,
      });
    }
  }
} catch (e) {
  console.error(e);
}
localStorage.removeItem('jwt');
history.replaceState(null, '', url.origin);
location.href = url.origin;