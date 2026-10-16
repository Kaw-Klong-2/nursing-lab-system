<?php
session_start();
require_once('config.php');

$params = [
    'post_logout_redirect_uri' => LOGOUT_REDIRECT_URI,
    'id_token_hint' => $_SESSION['ID_TOKEN'],
];

$logout_alllogin = END_SESSION_ENDPOINT . '?' . http_build_query($params);

session_destroy();

header("Location: $logout_alllogin");
