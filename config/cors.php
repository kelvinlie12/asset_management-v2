<?php


return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Bisa di-override lewat .env: FRONTEND_URL=https://a.com,http://localhost:5173
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('FRONTEND_URL', implode(',', [
            // Lokal (Vite)
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            // Server (tanpa garis miring di akhir)
            'https://demo-asset.gti.my.id',
            'https://asset.gti.my.id',
        ])))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // false cukup kalau login memakai token Bearer.
    // Ubah ke true hanya jika memakai cookie/session Sanctum;
    // dalam kondisi itu allowed_origins tidak boleh '*'.
    'supports_credentials' => false,

];