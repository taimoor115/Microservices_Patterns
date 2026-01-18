import { Request, Response } from 'express';
import { ProductCommands } from '../application/use-cases/product.commands';
import { ProductQueries } from '../application/use-cases/product.queries';

const commands = new ProductCommands();
const queries = new ProductQueries();

export class ProductController {

    static async create(req: Request, res: Response) {
        const product = await commands.create(req.body.name, req.body.price);
        res.status(201).json(product);
    }

    static async update(req: Request, res: Response) {
        const product = await commands.update(req.params.id, req.body.name, req.body.price);
        res.json(product);
    }

    static async delete(req: Request, res: Response) {
        await commands.delete(req.params.id);
        res.status(204).send();
    }


    static async list(req: Request, res: Response) {
        const products = await queries.getAll();
        res.json(products);
    }
}