import { EventEmitter } from 'events';

export enum ProductEvents {
    CREATED = 'PRODUCT_CREATED',
    UPDATED = 'PRODUCT_UPDATED',
    DELETED = 'PRODUCT_DELETED',
}

class EventBus extends EventEmitter {
    private static instance: EventBus;
    private constructor() { super(); }

    public static getInstance(): EventBus {
        if (!EventBus.instance) EventBus.instance = new EventBus();
        return EventBus.instance;
    }
}

export const eventBus = EventBus.getInstance();