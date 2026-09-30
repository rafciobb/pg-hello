#!/bin/sh
# Katalog na zdjęcia musi być zapisywalny dla Apache
mkdir -p /var/www/html/storage/uploads
chown -R www-data:www-data /var/www/html/storage/uploads
exec docker-php-entrypoint "$@"
