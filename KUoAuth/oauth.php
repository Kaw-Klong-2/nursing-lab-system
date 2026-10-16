<?php

require('Client.php');
require('./GrantType/IGrantType.php');
require('./GrantType/AuthorizationCode.php');
require('./GrantType/RefreshToken.php');
require('./GrantType/ClientCredentials.php');
require_once('config.php');

$client = new OAuth2\Client(CLIENT_ID, CLIENT_SECRET);
session_start();

//Athentication
if (!isset($_SESSION['ACCESS_TOKEN']) || !isset($_SESSION['ID_TOKEN'])) {
	if (!isset($_GET['code'])) {
		//Proof Key for Code Exchange (PKCE)
		$verifierBytes = random_bytes(64);
		$code_verifier = trim(strtr(base64_encode($verifierBytes), "+/", "-_"), "=");
		$challenge_bytes = hash("sha256", $code_verifier, true);
		$code_challenge = trim(strtr(base64_encode($challenge_bytes), "+/", "-_"), "=");
		$_SESSION['CODE_VERIFIER'] = $code_verifier;

		$auth_url = $client->getAuthenticationUrl(AUTHORIZATION_ENDPOINT, REDIRECT_URI, array('scope' => USER_SCOPE, 'state' => ''), $code_challenge);
		header('Location: ' . $auth_url);
		exit(0);
	} else {
		if (isset($_SESSION['CODE_VERIFIER']) && isset($_GET['code'])) {
			$params = array('code' => $_GET['code'], 'redirect_uri' => REDIRECT_URI, 'code_verifier' => $_SESSION['CODE_VERIFIER']);
			$response = $client->getAccessToken(TOKEN_ENDPOINT, 'authorization_code', $params);
			unset($_SESSION['CODE_VERIFIER']);
			$client->setAccessToken($response['result']['access_token']);

			$_SESSION['ACCESS_TOKEN'] = $response['result']['access_token'];
			$_SESSION['ID_TOKEN'] = $response['result']['id_token'];
			
			header("Location: ./getinfo.php");
			exit(0);

		} else {
			header('Location: ./logout.php');
			exit(0);
		}
	}
} else {
	header('Location: ./getinfo.php');
	exit(0);
}
