import {action, Action, thunk, Thunk} from "easy-peasy";

import {Archive} from "libarchive.js/main";
import {parse, ParseResult} from 'papaparse';
import JSZip from 'jszip';
const { convertArrayToCSV } = require('convert-array-to-csv');

Archive.init({
    workerUrl: '/libarchivejs/dist/worker-bundle.js'
});

export async function getFilesFromArchive(input: File): Promise<File[]> {
    const archive = await Archive.open(input);
    await archive.extractFiles();
    const archivedFiles = await archive.getFilesArray();
    return archivedFiles
        .filter(it => !it.path.includes('MACOS'))
        .map(it => it.file)
        .filter((it): it is File => !!it)
}

function convertCsv(csvData: string[][], rowFormat: string[]){
    const filtered = csvData.filter(it => !(it[0].includes('Comp') || it[0].includes('SD') || it[0].includes('Mean')))
    const linesByTitle: {[key: string]: string} = filtered.reduce((acc, val) => ({...acc, [val[0]]: val}), {})
    const donors = getDonors(filtered);
    const newRows = donors.flatMap(donor => rowFormat.map(row => `${donor}_${row}`)).map(rowTitle => linesByTitle[rowTitle] ?? [rowTitle])

    return convertArrayToCSV(newRows, {
        separator: ','
    });
}

export async function convertFiles(files: File[], options: {rowFormat: string[]}): Promise<Blob> {
    const promises = files.map(it => convertFile(it, options));
    const results = await Promise.all(promises);

    const zip = new JSZip();
    const archive = zip.folder(`output-${(new Date()).toISOString()}`)

    for(const result of results) {
        archive?.file(result[0].name, result[1]);
    }

    return zip.generateAsync({type: 'blob'});
}

export async function convertFile(file: File, options: {rowFormat: string[]}) {
    const csv = await parseCSV(file);
    const converted = await convertCsv(csv.data, options.rowFormat);

    return [file, converted]
}

export async function parseCSV(input: File): Promise<ParseResult<string[]>> {
    return new Promise((resolve, reject) => {
        parse<string[]>(input, {
            complete(results) {
                resolve(results)
            },
            error(error: Error) {
                reject(error)
            }
        });
    });
}

function getDonors(data: string[][]){
    const donorStrings = data.map(it => it?.[0]?.split('_')?.[0] ?? null).filter(it => it)
    const donorSet = new Set(donorStrings);
    return Array.from(donorSet);
}

function getSuffixes(input: {data: Array<Array<string>>}){
    const donorStrings = input.data.map(it => it?.[0]?.split('_')?.[1] ?? null).filter(it => it)
    const donorSet = new Set(donorStrings);
    return Array.from(donorSet);
}

const rowFormat = [
    'Unstimulated.fcs',
    'PMA,2f,Iono.fcs',
    'Flu.fcs',
    'Flu + aIFNy.fcs',
    'SARS.fcs',
    'SARS + aIFNy.fcs',
    'RSV.fcs',
    'RSV + aIFNy.fcs',
    'EBV.fcs',
    'EBV + aIFNy.fcs',
    'CMV.fcs',
    'CMV + aIFNy.fcs'
]

export interface TransformsModel {
    files: File[],
    donors: string[],
    addDonor: Action<TransformsModel, string>,
    suffixes: string[],
    rowFormat: string[],
    setRowFormatFromString: Action<TransformsModel, string>
    addSuffix: Action<TransformsModel, string>,
    readFile: Thunk<TransformsModel, File>
    addFile: Action<TransformsModel, File>
    addFiles: Thunk<TransformsModel, File[]>
}

export const transformsStore: TransformsModel = {
    files: [],
    donors: [],
    suffixes: [],
    rowFormat,
    setRowFormatFromString: action((state, payload) => {
        const rows = payload.split('\n');
        return {
            ...state,
            rowFormat: rows
        }
    }),
    addFile: action((state, payload) => {
        return {
            ...state,
            files: [...state.files, payload]
        }
    }),
    addDonor: action((state, payload) => {
        if(state.donors.includes(payload)){
            return state
        } else {
            return {
                ...state,
                donors: [...state.donors, payload]
            }
        }
    }),
    addSuffix: action((state, payload) => {
        if(state.suffixes.includes(payload)){
            return state
        } else {
            return {
                ...state,
                suffixes: [...state.suffixes, payload]
            }
        }
    }),
    addFiles: thunk((actions, payload) => {
        payload.map(it => actions.addFile(it));
    }),
    readFile: thunk(async (actions, file) => {
        if (file.type === 'application/zip') {
            const files = await getFilesFromArchive(file);
            actions.addFiles(files);
        } else {
            actions.addFile(file);
        }
    }),
    // onAddFile: thunkOn(
    //     // targetResolver:
    //     actions => actions.addFile,
    //     // handler:
    //     async (actions, target) => {
    //         const file: File = target.payload;
    //         if (file.name.endsWith('csv')) {
    //             const parsed = await parseCSV(file);
    //         }
    //     }
    // )
}