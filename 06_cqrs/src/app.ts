import express from 'express';
import mongoose from 'mongoose';
import { ProductController } from './presentation/product.controller';
import { initProductProjectionist } from './infrastructure/sync/ProductProjectionist';

const app = express();
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/cqrs');


initProductProjectionist();



app.post('/products', ProductController.create);
app.put('/products/:id', ProductController.update);
app.delete('/products/:id', ProductController.delete);


app.get('/products', ProductController.list);

app.listen(3000, () => console.log('CQRS Server running on port 3000'));