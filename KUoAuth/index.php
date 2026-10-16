<!DOCTYPE html>
<html>

<head>
	<title>KU ALL-Login Sample: OAuth 2.0 + PKCE + PHP + Sessions</title>
</head>

<body>
	<h1>KU ALL-Login Sample: OAuth 2.0 + PKCE + PHP + Sessions</h1>
	<p>PKCE <a href='https://datatracker.ietf.org/doc/html/rfc7636' target="_blank">(RFC 7636)</a> is an extension to the Authorization Code flow to prevent CSRF and authorization code injection attacks.</p>
	<h4><a href='./KUoAuth2.zip'>Downloading source code</a></h4>
	<h3>Login</h3>
	<form method="post" action="./oauth.php">
		<input type="submit" name="login" value="Login" />
	</form>

</body>

</html>