import { ProductReadModel } from '../../infrastructure/db/mongo';

export class ProductQueries {
    async getAll() {
        console.log('[Query] Fetching from MongoDB...');
        return ProductReadModel.find();
    }

    async getOne(productId: string) {
        return ProductReadModel.findOne({ productId });
    }
}