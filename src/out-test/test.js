import {Prop2} from "./Prop2";

export class Test{
    constructor() {
        this.prop1 = undefined;
        this.prop2 = new Prop2();
        Object.seal(this);
    }
}
