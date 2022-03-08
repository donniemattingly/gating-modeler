import {action, Action, thunk, Thunk} from "easy-peasy";
import {set, update} from 'lodash-es';

import {Archive} from "libarchive.js/main";
import {parse, ParseResult} from 'papaparse';
import JSZip from 'jszip';

const {convertArrayToCSV} = require('convert-array-to-csv');

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

declare global {
    interface Window {
        csvData: any;
        newRows: any;
    }
}

function convertCsv(csvData: string[][], rowFormat: string[]) {
    const filtered = csvData.filter(it => !(it[0].includes('Comp') || it[0].includes('SD') || it[0].includes('Mean')))
    const linesByTitle: { [key: string]: string } = filtered.reduce((acc, val) => ({...acc, [val[0]]: val}), {})
    const donors = getDonors(filtered);
    const newRows = donors.flatMap(donor => rowFormat.map(row => `${donor}_${row}`)).map(rowTitle => linesByTitle[rowTitle] ?? [rowTitle])

    return convertArrayToCSV(newRows, {
        separator: ','
    });
}


export async function convertFiles(files: File[], options: { rowFormat: string[] }): Promise<Blob> {
    const promises = files.map(it => convertFile(it, options));
    const results = await Promise.all(promises);

    const zip = new JSZip();
    const archive = zip.folder(`output-${(new Date()).toISOString()}`)

    for (const result of results) {
        archive?.file(result[0].name, result[1]);
    }

    return zip.generateAsync({type: 'blob'});
}

export async function convertFile(file: File, options: { rowFormat: string[] }) {
    const csv = await parseCSV(file);
    await readFileAsDonorData(file);
    const converted = await convertCsv(csv.data, options.rowFormat);
    window.csvData = csv;
    return [file, converted]
}

const getPercentageOrDonorName = (index: number, row: any[]) => {
    if(index === 0){
        return row[index]
    }

    return (parseFloat(row[index])).toFixed(4)
}

export async function readFileAsIFNyFrequencies(file: File): Promise<any> {
    const csv = await parseCSV(file)
    console.log(csv);
    const csvData = csv.data;
    const headerRow = csv.data[1];
    const keys: { [index: number]: string } = {...Object.fromEntries(headerRow.map((k, i) => [i, k])
            .filter(([i, k]) => k !== '')), 0: 'donor'}

    const data = csvData.slice(2, -1).filter(row => row[0] !== '').map((row: any) => {
        return Object.fromEntries(Object.entries(keys).map(([i, k]) => [k, getPercentageOrDonorName(parseInt(i), row)]))
    })

    return ['IFNy Frequencies', data]
}

export async function readFileAsDonorData(file: File) {
    const csv = await parseCSV(file)
    console.log(csv);
    const csvData = csv.data;
    const headerRow = csv.data[0];
    const keys: { [index: number]: string } = {...Object.fromEntries(headerRow.map((k, i) => [i, k])), 0: 'Name'}

    const filtered = csvData.filter(it => !(it[0].includes('Comp') || it[0].includes('SD') || it[0].includes('Mean')));
    const donors = getDonors(filtered);

    const donorData: any = Object.fromEntries(donors.map(it => [it, {name: it}]))
    filtered.forEach(row => {
        const [donor, peptideRaw] = row[0].split("_");
        const peptide = peptideRaw?.slice(0, -4) ?? ''
        const peptideData = Object.fromEntries(Object.keys(keys).map(it => parseInt(it)).map((k: number) => [keys[k], parseFloat(row[k])]));

        delete peptideData['Name'];
        delete peptideData[''];

        donorData[donor] = {...donorData[donor], [peptide]: peptideData}
    });

    delete donorData[''];

    let fileType = 'Frequency';

    if (file.name.toLocaleLowerCase().includes('mfi')) {
        fileType = 'MFI'
    }

    const fullData = [];
    for (const donor in donorData) {
        for (const peptide in donorData[donor]) {
            if (peptide !== 'name') {
                for (const marker in donorData[donor][peptide]) {
                    const unstim = donorData[donor]['Unstimulated'][marker];
                    const value = donorData[donor][peptide][marker];
                    const newData = {
                        [`foldChange${fileType}`]: (value / unstim).toFixed(3),
                        [`delta${fileType}`]: (value - unstim).toFixed(3),
                        [`original${fileType}`]: value,
                        [`unstimulated${fileType}`]: unstim,
                    }
                    set(donorData, [donor, peptide, marker], newData);
                    fullData.push({
                        donor,
                        peptide,
                        marker: sanitizeMarker(marker),
                        ...newData
                    })
                }
            }
        }
    }

    return [file.name, {byDonor: donorData, byRow: fullData}];
}

const sanitizeMarker = (marker: string): string => {
    if (marker.includes('+')) {
        return marker.split('+')[0];
    }

    if (marker.includes('MFI')) {
        return marker.split(' MFI')[0];
    }

    return marker.trim();
}

const cellTypes = {
    'Alveolar Macrophages': ['AM'],
    'Interstitial Macrophages': ['IM'],
    'Macrophages': ['Mac'],
    'Monocytes': ['Mono'],
    'Classical Monocytes': [],
    'Non Classical Monocytes': [],
    'Intermediate Monocytes': [],
    'pDC': ['pDC'],
    'Dendritic Cells': ['DC'],
    'Epithelial Cells': ['Epithelial'],
}

const cellAbbreviations = Object.fromEntries(Object.entries(cellTypes).flatMap(([primary, secondary]) => secondary.map(it => [it, primary])));
const cellTypeKeys = Object.keys(cellTypes);
const cellAbbreviationKeys = Object.keys(cellAbbreviations);

const cellTypeFromFileName = (filename: string): string => {
    for (const cellType of cellTypeKeys) {
        if (filename.includes(cellType)) {
            return cellType;
        }
    }

    for (const cellAbbreviation of cellAbbreviationKeys) {
        if (filename.includes(cellAbbreviation)) {
            return cellAbbreviations[cellAbbreviation];
        }
    }

    return filename;
}

const combineFiles = (donorData: Record<string, { byDonor: object, byRow: object[] }>): object[] => {
    const allData = [];
    const ifnyFrequencies = donorData['IFNy Frequencies'];
    delete donorData['IFNy Frequencies'];
    for (const file in donorData) {
        for (const row of donorData[file].byRow) {
            allData.push(
                {
                    file: file,
                    cellType: cellTypeFromFileName(file),
                    ...row
                }
            )
        }
    }

    const combinedRows = combineRows(allData, ifnyFrequencies)

    return combinedRows;
}

const antibody = 'aIFNy';
const combineRows = (rows: any[], ifnyFrequencies: any = null): any[] => {

    let ifnyByDonor: any;

    if(ifnyFrequencies){
        ifnyByDonor = Object.values(ifnyFrequencies).reduce((acc: any, val: any) => ({...acc, [val.donor]: val}),{})
    }

    console.log(ifnyByDonor);

    const getRowKey = (row: any): string => {
        return row.cellType + row.donor + row.marker + row.peptide
    }

    const byRowKey: any = {}

    for (const row of rows) {
        const orig: any = byRowKey[getRowKey(row)];
        byRowKey[getRowKey(row)] = {...orig, ...row}
    }

    const combinedRows = Object.values(byRowKey);
    const antiKeys = {
        antibodyFoldChangeFrequency: 'foldChangeFrequency',
        antibodyDeltaFrequency: 'deltaFrequency',
        antibodyOriginalFrequency: 'originalFrequency',
        antibodyUnstimulatedFrequency: 'unstimulatedFrequency',
        antibodyFoldChangeMFI: 'foldChangeMFI',
        antibodyDeltaMFI: 'deltaMFI',
        antibodyOriginalMFI: 'originalMFI',
        antibodyUnstimulatedMFI: 'unstimulatedMFI',
    }

    const antiRowsCombined = combinedRows.filter((it: any) => !it.peptide.includes('+')).map((row: any) => {
        const antiPeptideRowKey = getRowKey({...row, peptide: row.peptide + ' + ' + antibody});
        if (byRowKey[antiPeptideRowKey]) {
            const anti = byRowKey[antiPeptideRowKey];
            const antiValues = Object.fromEntries(Object.entries(antiKeys).map(([antiKey, regKey]) => {
                return [antiKey, anti[regKey]]
            }))

            const rowWithAntiValues =  {
                ...row,
                ...antiValues
            }

            console.log(row.donor);
            if(ifnyFrequencies && ifnyByDonor[row.donor]){
                return {
                    ...rowWithAntiValues,
                    ...ifnyByDonor[row.donor]
                }
            }

            return rowWithAntiValues;
        }

        return row;
    })

    return antiRowsCombined;
}

export async function analyzeFile(donorData: any) {

}


export async function parseCSV(input: File, asObjects = false): Promise<ParseResult<string[]>> {
    return new Promise((resolve, reject) => {
        parse<string[]>(input, {
            header: asObjects,
            complete(results) {
                resolve(results)
            },
            error(error: Error) {
                reject(error)
            }
        });
    });
}

function getDonors(data: string[][]) {
    const donorStrings = data.map(it => it?.[0]?.split('_')?.[0] ?? null).filter(it => it)
    const donorSet = new Set(donorStrings);
    return Array.from(donorSet);
}

function getSuffixes(input: { data: Array<Array<string>> }) {
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
    donorData: Record<string, object>
    setDonorData: Action<TransformsModel, Record<string, object>>
    donors: string[],
    addDonor: Action<TransformsModel, string>,
    suffixes: string[],
    rowFormat: string[],
    setRowFormatFromString: Action<TransformsModel, string>
    addSuffix: Action<TransformsModel, string>,
    readFile: Thunk<TransformsModel, File>
    addFile: Action<TransformsModel, File>
    addFiles: Thunk<TransformsModel, File[]>
    parseDonorData: Thunk<TransformsModel, undefined>
}

export const transformsStore: TransformsModel = {
    files: [],
    donorData: {},
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
        if (state.donors.includes(payload)) {
            return state
        } else {
            return {
                ...state,
                donors: [...state.donors, payload]
            }
        }
    }),
    addSuffix: action((state, payload) => {
        if (state.suffixes.includes(payload)) {
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
    setDonorData: action((state, payload) => {
        return {
            ...state,
            donorData: payload
        }
    }),
    parseDonorData: thunk(async (actions, payload, helpers) => {
        const files = helpers.getState().files;
        const donorData = Object.fromEntries(await Promise.all(files.map(it => {
            if (it.name.includes('IFNy')) {
                return readFileAsIFNyFrequencies(it);
            }

            return readFileAsDonorData(it);
        })));
        const allData = combineFiles(donorData);
        actions.setDonorData({all: {byRow: allData}, ...donorData});
    })
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