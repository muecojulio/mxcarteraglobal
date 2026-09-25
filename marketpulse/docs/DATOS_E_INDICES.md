# Datos e índices

No hay base SQL. Persistencia en localStorage. No aplica crear índices relacionales.

Caché: claves O(1) + TTL + evicción a 80 entradas. HTTP: Cache-Control s-maxage=30, SWR 120 en /api/*.
