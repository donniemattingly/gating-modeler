import { createStore } from 'easy-peasy';
import {TransformsModel, transformsStore} from "./transforms";

export interface StoreModel {
    transforms: TransformsModel
}

export const store = createStore<StoreModel>({
    transforms: transformsStore
}, {disableImmer: true});