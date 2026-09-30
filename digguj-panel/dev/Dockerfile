# Lokalny odpowiednik hostingu: Apache + PHP 8.2 z obsługą .htaccess
FROM php:8.2-apache
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers expires \
 && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf \
 && printf 'upload_max_filesize=32M\npost_max_size=40M\nexpose_php=Off\n' > /usr/local/etc/php/conf.d/digguj.ini \
 && printf 'SetEnvIf Request_URI ".*" DIGGUJ_ALLOW_HTTP=1\nServerName localhost\n' > /etc/apache2/conf-enabled/digguj.conf
COPY entrypoint.sh /usr/local/bin/digguj-entrypoint
RUN sed -i "s/\r$//" /usr/local/bin/digguj-entrypoint && chmod +x /usr/local/bin/digguj-entrypoint
ENTRYPOINT ["digguj-entrypoint"]
CMD ["apache2-foreground"]
