const express = require('express');
const multer = require('multer');
const iconvLite = require('iconv-lite');
const pdfjsLib = require('pdfjs-dist/build/pdf');
const WordExtractor = require('word-extractor');
const AWS = require('aws-sdk');
const { assert } = require('pdfjs-dist/build/pdf.worker');

const router = express.Router();

// pdfParser 준비
const getPdfText = async (data) => {
    let line = 0;
    let finalString = "";
    let doc = await pdfjsLib.getDocument({data}).promise;
    let pageTexts = Array.from({length: doc.numPages}, async (v, i) => {
        // arr은 각 토큰 객체를 담은 객체 배열
        let arr = (await (await doc.getPage(i+1)).getTextContent()).items;
        // map을 통해 객체의 str = text 정보만 가진 배열로 다시 만듬.
        return arr.map(token => {
            // 구문 분석기
            finalString = "";
            if (line != token.transform[5]) {
                if (line != 0) {
                    finalString += '\r\n';
                }
                line = token.transform[5];
            }
            finalString += token.str;
            return finalString;
        }).join(""); // join을 통해 문자열로 재생성
    });
    return (await Promise.all(pageTexts)).join("");
}

// wordParser 준비
const wordExtractor = new WordExtractor();

// multer 미들웨어 파싱 (비 저장)
// MemoryStorage 사용 예상
const upload = multer();

// 아마존 S3 스토어 연결
const s3 = new AWS.S3({
    region: 'ap-northeast-2',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

router.get('/', (req, res) => {
    return res.status(200).send('연결 안정적');
});

router.post('/presigned', upload.single('fileKey'), async (req, res, next) => {
    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: 'original/' + req.file.originalname,
        Expires: 60 * 3,
    }
    try {
        //console.log(req.file);
        const signedUrlPut = await s3.getSignedUrlPromise("putObject", params);
        return res.send(signedUrlPut);
    } catch (error) {
        next(error);
    }
});

router.get('/file/download/:filename', async (req, res, next) => {
    try {
        const fn = () => {
            if (req.headers['user-agent'].includes("MSIE") || req.headers['user-agent'].includes("Trident")) {
                return encodeURIComponent(req.params.filename).replace(/\\+/gi, "%20");
            } else if (req.headers['user-agent'].includes("Chrome")) {
                return iconvLite.encode(req.params.filename, "UTF-8");
            } else if (req.headers['user-agent'].includes("Opera")) {
                return iconvLite.decode(iconvLite.encode(req.params.filename, "UTF-8"), 'ISO-8859-1');
            } else if (req.headers['user-agent'].includes("Firefox")) {
                return iconvLite.decode(iconvLite.encode(req.params.filename, "UTF-8"), 'ISO-8859-1');
            }
            return req.params.filename;
        }
        
        res.attachment(fn().toString());
        const downloadS3 = await s3.getObject({
            Bucket: process.env.S3_BUCKET,
            Key: 'original/' + fn()
        }).createReadStream();
        downloadS3.pipe(res);
    } catch (error) {
        next(error);
    }
});

router.delete('/file/delete/:filename', async (req, res, next) => {
    try {
        const deleteRes = await s3.deleteObjects({
            Bucket: process.env.S3_BUCKET,
            Delete: {
                Objects: [{ 
                    Key: `original/${req.params.filename}`
                }],
                Quiet: false
            },
        }, (err, data) => {
            if (err) { console.log(err); }
            console.log('s3 deleteObject ', data);
        });
        return res.status(200).send('파일 삭제');
    } catch (error) {
        next(error);
    }
});

router.get('/file/extract/:filename', async (req, res, next) => {
    try {
        const ext = req.params.filename.substring(req.params.filename.lastIndexOf(".") + 1);
        switch(ext) {
            case 'txt':
                await s3.getObject({
                    Bucket: process.env.S3_BUCKET,
                    Key: `original/${req.params.filename}`
                }, (err, data) => {
                    if (err) console.log(err);
                    const body = new Buffer.from(data.Body).toString('utf8');
                    res.send(body);
                });
                break;
            case 'pdf':
                await s3.getObject({
                    Bucket: process.env.S3_BUCKET,
                    Key: `original/${req.params.filename}`
                }, (err, data) => {
                    if (err) console.log(err);
                    const bufferArray = new Uint8Array(data.Body);
                    // pdf 파싱 내용 작성
                    const parsing = getPdfText(bufferArray).then(
                        (result) => {
                            res.status(200).send(result);
                        }
                    );
                });
                break;
            case 'docx':
            case 'doc':
                await s3.getObject({
                    Bucket: process.env.S3_BUCKET,
                    Key: `original/${req.params.filename}`
                }, (err, data) => {
                    if (err) console.log(err);
                    //console.log(data?.Body);
                    // const bufferArray = new Uint8Array(data.Body);
                    // docx 파싱 내용 작성
                    const extracted = wordExtractor.extract(data?.Body);
                    extracted.then((result) => {
                        res.status(200).send(result.getBody());
                    });
                });
                break;
            default:
                res.send('잘못된 확장자입니다.');
        }
    } catch (error) {
        next(error);
    }
});


router.get('/next',function(req,res,next){
    console.log('step1');
    next();
})



router.get('/add/:num',(req,res) => {
    async function add(){
        var 프로미스 = new Promise(function(성공,실패){
            var result = Number(req.params.num) * 10;
            실패(result);
        });

    try {
        var view = await 프로미스;
            console.log(view)
            res.send(view)
    } catch {
        res.send("실패반환")
    }
}
    add()

})


// router.get('/:input',(req,res) => {
//     if(req.params.input == "test"){
//         res.status(200).send("testing")   
//     }
//     var result = 0;
//     var num = Number(req.params.input);
//     console.log(typeof(num))
//     for(let i= 0;i<=num;i++){
//         result += i;
//     }
//     res.send(console.log(result));
// })

router.get('/Lookup',(req,res) => {
            const gradeList = [{
                id : 0,
                name: "민준",
                grade : "수학",
                score : "A", 
                },
            {
                id : 1,
                name: "서연",
                grade : "영어",
                score : "B",
            },
            {
                id : 2,
                name: "서준",
                grade : "사회",
                score : "F",
            },

            {
                id : 3,
                name: "서윤",
                grade : "수학",
                score : "B",
            },
            {
                id : 4,
                name: "도윤",
                grade : "과학",
                score : "A",
            },
            {
                id : 5,
                name: "지우",
                grade : "국어",
                score : "C",
            },
            {
                id : 6,
                name: "예준",
                grade : "과학",
                score : "F",
            },
            {
                id : 7,
                name: "서현",
                grade : "사회",
                score : "D",
            },
            {
                id : 8,
                name: "주원",
                grade : "국어",
                score : "C",
            },
            {
                id : 9,
                name: "민서",
                grade : "수학",
                score : "A",
            },            
        ]
        res.status(200).json(gradeList)
})

router.get('/:grade', (req,res) => {
    inputData = req.params.grade
    outputData = new Array();

    const gradeList = [{
                    id : 0,
                    name: "민준",
                    grade : "수학",
                    score : "A", 
                    },
                {
                    id : 1,
                    name: "서연",
                    grade : "영어",
                    score : "B",
                },
                {
                    id : 2,
                    name: "서준",
                    grade : "사회",
                    score : "F",
                },

                {
                    id : 3,
                    name: "서윤",
                    grade : "수학",
                    score : "B",
                },
                {
                    id : 4,
                    name: "도윤",
                    grade : "과학",
                    score : "A",
                },
                {
                    id : 5,
                    name: "지우",
                    grade : "국어",
                    score : "C",
                },
                {
                    id : 6,
                    name: "예준",
                    grade : "과학",
                    score : "F",
                },
                {
                    id : 7,
                    name: "서현",
                    grade : "사회",
                    score : "D",
                },
                {
                    id : 8,
                    name: "주원",
                    grade : "국어",
                    score : "C",
                },
                {
                    id : 9,
                    name: "민서",
                    grade : "수학",
                    score : "A",
                },            
            ]
        
        var tmpList = new Array();
        gradeList.forEach(element => {
            if(element.grade == inputData){
                tmpList.push(element.id)
            }
        });

        console.log(tmpList)
    
        for(let j = 0;j<tmpList.length;j++){   
            for(let i =0;i<gradeList.length;i++){
                if(gradeList[i].id == tmpList[j]){
                    outputData.push(gradeList[i].name);
                }
                
            }
        }

    // req = request
    // res = response
    // nrl의 변수를 받고 싶을 땐 req.params.number
    // 보낼때는 res.status(200).send(보내고 싶은 데이터);
    res.status(200).send(outputData);
    
});

module.exports = router;