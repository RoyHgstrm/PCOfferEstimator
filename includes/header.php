<?php
if (session_status() == PHP_SESSION_NONE && headers_sent() === false) {
    session_start();
}
ob_start();



if (!isset($_SESSION['session_id'])) {
    $_SESSION['session_id'] = uniqid();  // Generate a unique session ID
}



?>
<!DOCTYPE html>
<html lang="fi">
<head>
  


    <title class="notranslate">Audio</title>


    <!-- Preload Critical Resources -->
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.min.css" as="style">
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap" as="style">
    <link rel="preload" href="https://cdn.tailwindcss.com" as="script">
    
    <!-- JavaScript -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- CSS -->
    <link href="https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.min.css" rel="stylesheet" type="text/css" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap">


    <!-- Responsive Meta Tag -->
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">

    <!-- GTranslate Widget -->
    <div class="gtranslate_wrapper"></div>
    <script>
      window.gtranslateSettings = {
        "default_language": "fi",
        "detect_browser_language": true,
        "languages": ["fi","sv","en"],
        "wrapper_selector": ".gtranslate_wrapper"
      };
    </script>
    <script src="https://cdn.gtranslate.net/widgets/latest/float.js" defer></script>

    <!-- Global Styles -->
    <style>
        * {
            font-family: 'Poppins', sans-serif;
        }

    </style>
</head>

<body class="bg-zinc-900 min-h-screen w-full flex flex-col items-center justify-center md:flex-row md:justify-around xl:p-0 overflow-x-hidden">
    <div class="w-full mx-auto flex flex-col items-center">


<header class="text-base-content font-bold p-6 lg:p-8 w-full flex justify-center mx-auto">

</header>