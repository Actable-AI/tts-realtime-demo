## Getting Started

### Environment variables

Copy and rename `.env.example` => `.env.local`, use your variables

### Install the dependencies

```bash
pnpm i
```

### Start the dev server

```bash
pnpm run dev
```

Open [localhost](http://localhost:3030) with your browser to see the result.

## BEFORE UPLOADING TO PRODUCTION

the version of the node is `v20.1.0`, `<root>/frontend/.nvmrc` for more details

### Install the dependencies

```bash
npm i
```

### Build the project

```bash
npm build
```

### Deploy

`<root>/frontend/dist` is the folder that you need to upload to the server

Learn more about [Deploying a Static Site](https://vitejs.dev/guide/static-deploy)

## Extra

### After changing the endpoints on the backend please use

Download swagger schema and generate queries and types for the frontend

```bash
npm run api
```

<details open><summary>Stack</summary>
<img src="https://img.shields.io/badge/React-61DAFB.svg?style=for-the-badge&logo=React&logoColor=black"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white"/>
<img src="https://img.shields.io/badge/Prettier-F7B93E.svg?style=for-the-badge&logo=Prettier&logoColor=black"/>
<img src="https://img.shields.io/badge/React%20Query-FF4154.svg?style=for-the-badge&logo=React-Query&logoColor=white"/>
<img src="https://img.shields.io/badge/React%20Router-CA4245.svg?style=for-the-badge&logo=React-Router&logoColor=white"/>
<img src="https://img.shields.io/badge/pnpm-F69220.svg?style=for-the-badge&logo=pnpm&logoColor=white"/>
<img src="https://img.shields.io/badge/Axios-5A29E4.svg?style=for-the-badge&logo=Axios&logoColor=white"/>
<img src="https://img.shields.io/badge/styledcomponents-DB7093.svg?style=for-the-badge&logo=styled-components&logoColor=white"/>
<img src="https://img.shields.io/badge/ESLint-4B32C3.svg?style=for-the-badge&logo=ESLint&logoColor=white"/>
<img src="https://img.shields.io/badge/Vite-646CFF.svg?style=for-the-badge&logo=Vite&logoColor=white"/>
<img src="https://img.shields.io/badge/Ant%20Design-0170FE.svg?style=for-the-badge&logo=Ant-Design&logoColor=white"/>
</details>
