<?php
/**
 * test_office365_email.php
 * Triggers a test email to aravinmenon000@gmail.com using Office 365 SMTP
 *
 * Requirements:
 * - PHPMailer (composer require phpmailer/phpmailer) or direct SMTP socket
 */

define('MAILHOST', 'smtp.office365.com');
define('PORT', '587');
define('USERNAME', 'aetinssmtp@kgisl.com');
define('PASSWORD', 'Trigger@12345');
define('SETFROM', 'aetinssmtp@kgisl.com');
define('REPLYTO', 'aetinssmtp@kgisl.com');

$recipient = 'aravinmenon000@gmail.com';
$subject = '🎵 DobbyPay Music: Office 365 SMTP Live Test';

echo "====================================================\n";
echo "📧 OFFICE 365 PHP SMTP TEST\n";
echo "====================================================\n";
echo "Host     : " . MAILHOST . ":" . PORT . "\n";
echo "Username : " . USERNAME . "\n";
echo "Recipient: " . $recipient . "\n";
echo "----------------------------------------------------\n";

// Check if PHPMailer is available
if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = MAILHOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = USERNAME;
        $mail->Password   = PASSWORD;
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)PORT;

        $mail->setFrom(SETFROM, 'DobbyPay Music Cloud');
        $mail->addAddress($recipient);
        $mail->addReplyTo(REPLYTO, 'DobbyPay Music Cloud');

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = '<h2>✅ Office 365 SMTP Verification</h2><p>This email was successfully sent from <strong>' . USERNAME . '</strong> to <strong>' . $recipient . '</strong>.</p>';
        $mail->AltBody = "This email was successfully sent from " . USERNAME . " to " . $recipient;

        $mail->send();
        echo "✅ Email has been sent successfully via PHPMailer!\n";
    } catch (Exception $e) {
        echo "❌ Message could not be sent. Mailer Error: {$mail->ErrorInfo}\n";
    }
} else {
    // Pure PHP Socket SMTP Client (No composer dependencies needed!)
    try {
        $socket = fsockopen(MAILHOST, (int)PORT, $errno, $errstr, 15);
        if (!$socket) {
            throw new Exception("Connection to " . MAILHOST . ":" . PORT . " failed ($errno): $errstr");
        }

        function readResponse($sock) {
            $data = '';
            while ($str = fgets($sock, 515)) {
                $data .= $str;
                if (substr($str, 3, 1) == ' ') break;
            }
            return $data;
        }

        echo "Connecting to SMTP server...\n";
        readResponse($socket);

        fputs($socket, "EHLO " . gethostname() . "\r\n");
        readResponse($socket);

        fputs($socket, "STARTTLS\r\n");
        readResponse($socket);

        stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

        fputs($socket, "EHLO " . gethostname() . "\r\n");
        readResponse($socket);

        fputs($socket, "AUTH LOGIN\r\n");
        readResponse($socket);

        fputs($socket, base64_encode(USERNAME) . "\r\n");
        readResponse($socket);

        fputs($socket, base64_encode(PASSWORD) . "\r\n");
        $authResp = readResponse($socket);

        if (strpos($authResp, '235') === false) {
            throw new Exception("Authentication failed: " . trim($authResp));
        }

        fputs($socket, "MAIL FROM: <" . SETFROM . ">\r\n");
        readResponse($socket);

        fputs($socket, "RCPT TO: <" . $recipient . ">\r\n");
        readResponse($socket);

        fputs($socket, "DATA\r\n");
        readResponse($socket);

        $headers  = "From: DobbyPay Music <" . SETFROM . ">\r\n";
        $headers .= "Reply-To: <" . REPLYTO . ">\r\n";
        $headers .= "To: <" . $recipient . ">\r\n";
        $headers .= "Subject: " . $subject . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";

        $body = "<h2>✅ Office 365 SMTP Test Passed</h2><p>Triggered successfully to <b>" . $recipient . "</b>.</p>\r\n.\r\n";

        fputs($socket, $headers . $body);
        $sendResp = readResponse($socket);

        fputs($socket, "QUIT\r\n");
        fclose($socket);

        echo "✅ Email dispatched successfully!\n";
        echo "Response: " . trim($sendResp) . "\n";
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
    }
}
echo "====================================================\n";
?>
