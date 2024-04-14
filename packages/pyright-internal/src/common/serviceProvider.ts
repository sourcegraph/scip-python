/*
 * serviceProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Container for different services used within the application.
 */

interface InternalKey {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class ServiceKey<T> implements InternalKey {}

export class ServiceProvider {
    private _container: Map<InternalKey, any> = new Map<InternalKey, any>();

    constructor(initialServices: { key: InternalKey; value: any }[] = []) {
        initialServices.forEach((entry) => {
            this.add(entry.key, entry.value);
        });
    }

    add<T>(key: ServiceKey<T>, value: T) {
        this._container.set(key, value);
    }

    tryGet<T>(key: ServiceKey<T>): T | undefined {
        return this._container.get(key);
    }

    get<T>(key: ServiceKey<T>): T {
        const value = this.tryGet<T>(key);
        if (value === undefined) {
            throw new Error(`Global service provider not initialized for ${key.toString()}`);
        }
        return value;
    }
}
