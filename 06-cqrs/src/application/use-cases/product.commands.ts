import { PrismaClient } from '@prisma/client';
import { eventBus, ProductEvents } from '../../infrastructure/bus/EventBus';

const prisma = new PrismaClient();

export class ProductCommands {
    async create(name: string, price: number) {
        const product = await prisma.product.create({ data: { name, price } });
        console.log('Emitting CREATED event for product')
        eventBus.emit(ProductEvents.CREATED, product);
        return product;
    }

    async update(id: string, name: string, price: number) {
        const product = await prisma.product.update({
            where: { id },
            data: { name, price }
        });
        console.log('Emitting UPDATED event for product')
        eventBus.emit(ProductEvents.UPDATED, product);
        return product;
    }

    async delete(id: string) {
        await prisma.product.delete({ where: { id } });
        console.log('Emitting DELETED event for product')
        eventBus.emit(ProductEvents.DELETED, id);
    }
}