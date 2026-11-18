# Lavanderia Marketplace

Marketplace de servicios de lavanderia para Bogota.

## Tecnologias
- Mobile: React Native + Expo + TypeScript.
- API: NestJS 11 + TypeScript.
- Base de datos: PostgreSQL 17.
- Monorepo: pnpm workspaces.

## Preparacion
1. Instalar Node.js, pnpm y Docker Desktop.
2. Ejecutar pnpm install.
3. Copiar .env.example a .env y configurar la clave local.

## Desarrollo
Ejecutar desde la raiz, en terminales separadas:

- pnpm db:up
- pnpm dev:api
- pnpm dev:mobile

## Direcciones locales
- API: http://localhost:3000
- PostgreSQL: 127.0.0.1:15432

## Estado
Las aplicaciones arrancan y PostgreSQL funciona.
La conexion entre NestJS y PostgreSQL esta pendiente.
