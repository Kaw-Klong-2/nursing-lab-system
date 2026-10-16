$verifier_bytes = random_bytes(64);
$code_verifier = rtrim(strtr(base64_encode($verifier_bytes), "+/", "-_"), "=");