const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const jskv = require('keyvalues-node');
const program = require('commander');
const chokidar = require('chokidar');
const { read_all_files, read_sub_directories } = require('./utils');

const path_form = 'excels/localization';
const path_goto = 'game/resource';
const excel_keyname = 1;
let locali_data = {};

function single_excel_to_kv(rowval) {
    let key_row = rowval[excel_keyname];
    let key_in_column = (val)=>val.toString();
    let kv_data = {};

    for (j = 1; j < key_row.length; ++j) {
        let language = key_row[j]
        kv_data[language]={}
        for (i = excel_keyname+1; i < rowval.length; ++i) {
            let row_data = rowval[i];
            let main_key = row_data[0];
            if (main_key == null) continue;
            let ret_val = row_data[j];
            if (ret_val == null) continue;
            kv_data[language][main_key] = key_in_column(ret_val);
        }
    }
    return kv_data;
}

function single_excel_filter(file) {
    console.log(`excel 2 localization translation:`);
    if ( file.indexOf('.xls') ==0 || file.indexOf('~$') >= 0 )
        return  console.log(' compiler ingore non-excel file=>', file);

    let sheets = xlsx.parse(file);
    let sheet  = sheets[0];
    let rowval = sheet.data;
    if (rowval.length < excel_keyname+2)
        return console.log(`ignore empty file=>${file}\n  'REQUIRES AT LEAST ${excel_keyname+2}LINES (comment, key data)`);

    let kv_data = single_excel_to_kv(rowval);
    let datasum = Object.keys(kv_data).length;
    if (datasum <= 0)
        return console.log(`ignore empty file=>${file}\n  total items count-> ${datasum}`);

    for(const i in kv_data){
        if(!locali_data[i]){
            locali_data[i]={ Language: i, Tokens:{} }
        }
        for (const j in kv_data[i]) {
            locali_data[i].Tokens[j] = kv_data[i][j];
        }
    }
}

const all_excel_to_kv = async (path) => {
    locali_data = {};
    const files = read_all_files(path_form);
    files.forEach((file) => {
        single_excel_filter(file);
    });
    if (!fs.existsSync(path_goto)) fs.mkdirSync(path_goto);
    for (const language in locali_data) {
        let file_name = `/addon_${language.toLowerCase()}.txt`;
        fs.writeFileSync(path_goto+file_name, jskv.encode({addon_title:locali_data[language]}).replace("addon_title","xlsx2lang"));
        console.log('success xlsx->localization =>', file_name);
    }
};

(async () => {
    all_excel_to_kv();
    program.option('-w, --watch', 'Watch Mode').parse(process.argv);
    if (program.watch) {
        console.log('start with watch mode');
        chokidar.watch(path_form).on('change', () => {
            all_excel_to_kv();
        });
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
