import express, { Request, Response } from 'express';
import listIdentifiers from './list-identifiers'
import createIdentifier from './create-identifier'
import createCredentials from './create-credentials'
import verifyCredential from './verify-credential'

const app = express();
const port = 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.get('/listIdentifiers', async (req: Request, res: Response) => {
    const response = await listIdentifiers();

    res.send(response);
});

app.get('/createIdentifier', async (req: Request, res: Response) => {
    const response = await createIdentifier();

    res.send(response);
});

app.get('/createCredentials', async (req: Request, res: Response) => {
    const response = await createCredentials();

    res.send(response);
});

app.get('/verifyCredential', async (req: Request, res: Response) => {
    const response = await verifyCredential();

    res.send(response);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
