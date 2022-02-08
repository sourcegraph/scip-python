// TODO: This might need to be threadsafe at some point?
let _id = 0;
function nextID(): number {
    _id = _id + 1;
    return _id;
}

export class Emitter {
    constructor() {}
}

