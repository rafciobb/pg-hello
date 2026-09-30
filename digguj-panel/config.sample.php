<?php
// Zwykle NIE musisz tworzyć tego pliku ręcznie – strona /install zrobi to za Ciebie.
// Jeśli jednak instalator nie może zapisać pliku, skopiuj ten plik jako config.php i uzupełnij dane.
return [
    'db' => [
        'host' => 'xxxxxx.mysql.db',   // serwer bazy z panelu OVH (Web Cloud → Hosting → Bazy danych)
        'port' => 3306,
        'name' => 'nazwa_bazy',
        'user' => 'uzytkownik_bazy',
        'pass' => 'haslo_do_bazy',
    ],
    // Klucz odzyskiwania – potrzebny na stronie /install do zmiany zapomnianego hasła (min. 16 znaków, losowy)
    'setup_key' => 'WPISZ-TU-DLUGI-LOSOWY-CIAG-ZNAKOW',
    'max_upload_mb' => 25,
    'session_days' => 14,
];
