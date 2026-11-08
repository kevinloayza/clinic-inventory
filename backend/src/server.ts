import { createApp } from './app';
import { createPool } from './db';

const port = Number(process.env.PORT ?? 4000);
createApp(createPool()).listen(port, () => console.log(`API escuchando en :${port}`));
