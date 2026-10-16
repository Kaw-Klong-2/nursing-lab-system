<?php

require_once('config.php');

session_start();

if (!isset($_SESSION['ACCESS_TOKEN'])) {
	header('Location: ./logout.php');
	exit(0);
}
?>
<html>

<head>
	<title>KU ALL-Login Sample: OAuth 2.0 + PKCE + PHP + Sessions</title>
</head>

<body>
	<h1>KU ALL-Login Sample: OAuth 2.0 + PKCE + PHP + Sessions</h1>
	<?php
	$headers[] = "Content-Type:application/x-www-form-urlencoded ";
	$headers[] = "Authorization: Bearer " . $_SESSION['ACCESS_TOKEN'];
	$curl = curl_init();
	curl_setopt($curl, CURLOPT_URL, USER_INFO);
	curl_setopt($curl, CURLOPT_POST, false);
	curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($curl, CURLOPT_VERBOSE, false);
	curl_setopt($curl, CURLOPT_HEADER, false);
	curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

	$result = curl_exec($curl);
	$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
	$endpoint = USER_INFO;

	// evaluate for success response
	if ($status != 200) {
		echo "Error: call to URL $endpoint failed with status $status, response $result, curl_error " . curl_error($curl) . ", curl_errno " . curl_errno($curl) . "<br>";
		exit(0);
	}
	curl_close($curl);
	// Convert the JSON data to an array
	$array_data = json_decode($result);

	// Print information about the array
	echo '<pre>';
	print_r($array_data);
	echo '</pre>';

	echo "<h3><a href='./logout.php'>Logout</a></h3>";
	
	?>
</body>

</html>