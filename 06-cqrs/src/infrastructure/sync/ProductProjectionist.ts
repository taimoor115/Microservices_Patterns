import { eventBus, ProductEvents } from '../bus/EventBus';
import { ProductReadModel } from '../db/mongo';

export const initProductProjectionist = () => {

    eventBus.on(ProductEvents.CREATED, async (data) => {
        await ProductReadModel.create({
            productId: data.id,
            name: data.name,
            price: data.price
        });
        console.log('[Sync] Created in MongoDB');
    });


    eventBus.on(ProductEvents.UPDATED, async (data) => {
        await ProductReadModel.findOneAndUpdate(
            { productId: data.id },
            { name: data.name, price: data.price }
        );
        console.log('[Sync] Updated in MongoDB');
    });


    eventBus.on(ProductEvents.DELETED, async (productId) => {
        await ProductReadModel.findOneAndDelete({ productId });
        console.log('[Sync] Deleted from MongoDB');
    });
};