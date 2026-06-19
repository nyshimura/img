# 🖼️ Editor Web — Aplicador de Marca d’Água, Logo e Selo

Editor web que aplica **marca d'água**, **logo** e **selo** às imagens em massa.  
Frontend em **React** (puro / TypeScript disponível), utiliza **JSZip** para compactar os resultados e um **endpoint PHP** (`api.php`) para carregar e salvar imagens de branding.

---

## ⚙️ 1. `index.js` (versão JS)

**Arquivo:** `img/index.js`  
**Variável a alterar:** `API_URL`

### 📍 Local (exemplo no código)
```js
// MUDAR ESTE VALOR para o endpoint do seu servidor
const API_URL = 'https://meu-dominio.com/api.php';
```

### 🧭 O que fazer
Substituir pelo endereço correspondente ao seu servidor local ou remoto, por exemplo:

```bash
http://localhost/meu-projeto/api.php
```
ou
```bash
https://meu-dominio.com/api.php
```

---

## 🧩 2. `index.html` — Caminhos de assets

**Arquivo:** `index.html`

### 📍 Trecho relevante (exemplo)
```html
<link rel="stylesheet" href="/img/index.css" />
<script src="/img/index.js" type="text/babel"></script>
```

### 🧭 O que fazer
Se você for servir os assets em outra pasta, ajuste os caminhos para **relativos** (recomendado) ou para o **prefixo correto do servidor**.

**Exemplos:**
```html
<link rel="stylesheet" href="./img/index.css" />
<script src="./img/index.js" type="text/babel"></script>
```
ou
```html
<link rel="stylesheet" href="/seu-subpath/img/index.css" />
```

---

## 🗄️ 3. Criar o Banco de Dados

Crie a tabela abaixo para armazenar as imagens de marca (branding) utilizadas no sistema.

```sql
CREATE TABLE `branding_assets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `logo` MEDIUMTEXT NOT NULL,
  `watermark` MEDIUMTEXT NOT NULL,
  `black_shield` MEDIUMTEXT NOT NULL,
  `white_shield` MEDIUMTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 💡 Observação

> Após clonar o repositório, lembre-se de editar os caminhos acima para os **seus próprios** valores (URLs, pastas e configurações locais).  
> Isso garante que o projeto funcione corretamente no seu ambiente e não dependa dos caminhos do desenvolvedor original.

---

📘 **Autor:** nyshimura  
🛠️ **Tecnologias:** JS Vanilla, JSZip, PHP, MySQL  
📦 **Arquivos principais:** `index.html`, `index.js`, `index.css`, `api.php`
