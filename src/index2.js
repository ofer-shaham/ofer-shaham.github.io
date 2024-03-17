const MODE_DEBUG = true
let counter = 0
let idTimout = null
const logger = {
    info: console.info,
    log: MODE_DEBUG ? ()=>{}
    : console.log,
    error: console.error
}

function showLanguages() {
    //dynamic mapLanguageNameToCode: build a language map based upon device status, example: { "Deutsch": "de-DE" }
    const createLanguageMap = ()=>{
        const languageMap = {};
        const voices = speechSynthesis.getVoices();
        voices.forEach((voice)=>{
            const languageName = voice.name.split(' ')[1];
            languageMap[languageName] = voice.lang;
        });

        logger.log(languageMap);
        return languageMap
    }
    const languageMap = createLanguageMap()
    logger.log({
        languageMap
    })
}

function getRandomVoice(language) {
    const lowercasedLanguage = language.replace('_', '-')
    const voices = speechSynthesis.getVoices();
    const filteredVoices = voices.filter(r=>r.lang == lowercasedLanguage)
    const length = filteredVoices.length
    const voice = filteredVoices[Math.floor(Math.random(length) * length)]
    return voice
}

function mapLanguageNameToCode(languageName) {
    const languageMap = {
        english: 'en-US',
        spanish: 'es-ES',
        hebrew: 'he-IL',
        russian: 'ru-RU',
        arabic: 'ar-SA',
        italian: 'it-IT'// Add more language mappings as needed
    };

    const lowercaseLanguageName = languageName.toLowerCase();

    if (lowercaseLanguageName in languageMap) {
        return languageMap[lowercaseLanguageName];
    } else {
        return null;
    }
}

async function translateText(source, target, text) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURI(text)}`;
    logger.log({url});
    try {
        const response = await fetch(url);
        const data = await response.json();
        const translatedText = data[0][0][0];
        logger.log(`Translated text: ${translatedText}`);
        return translatedText;
    } catch (error) {
        console.error('Error translating text:', error);
        return 'error';
    }
}

function setFromLanguage(speechResult) {
    const languageRegex = /(speak|change\slanguage\sto)\s+(\w+)\b/i;
    const match = speechResult.match(languageRegex);
    let translateFrom = null
    if (match[2]) {
        translateFrom = mapLanguageNameToCode(match[2]);
    }
    return [translateFrom, '']
}

function setTranslationLanguage(userInput) {
    const pattern = /translate\s+from\s+(\w+)\s+to\s+(\w+)/i;
    let translateFrom = null
    let translateTo = null
    const matches = userInput.match(pattern);
    if (matches.length === 3) {
        translateFrom = mapLanguageNameToCode(matches[1]);
        translateTo = mapLanguageNameToCode(matches[2]);
    }
    return [translateFrom, translateTo];
}

//trigger an action based upon available commands. 
//available commands allows to set source/target language
//available options: repeat mode/translation mode
//repeat mode: 
//say "speak arabic" - to setup a source language "arabic"
//say "translate from hebrew to english" - to setup source language as hebrew and target language as english
//say "show commands" - will output available commands to the console
function analyzeText(speechResult) {
    let translateFrom = null;
    let translateTo = null;
    logger.log("analyzeText   " + speechResult);
    const isIncluding = speechResult.toLowerCase().includes.bind(speechResult);
    if (isIncluding("show languages")) {
        showLanguages()
    } else if (isIncluding("show commands")) {
        logger.log("translate from X to Y")
        logger.log("change language to X")
        logger.log('speak X')
    } else if (isIncluding("translate from")) {
        {
            [translateFrom,translateTo] = setTranslationLanguage(speechResult);
        }
    } else if (((isIncluding("speak") && speechResult.split(' ').length === 2) || isIncluding("change language to"))) {
        [translateFrom,translateTo] = setFromLanguage(speechResult);
        if (translateTo == null || translateFrom == null) {
            console.error('invalid   language set:', [translateFrom, translateTo])
        }
    }

    console.info([translateFrom, translateTo])
    return [translateFrom, translateTo];
}

function option1() {
    navigator.mediaDevices.getUserMedia({
        audio: true
    }).then(function(stream) {

        logger.log('option1', ++counter)
        const SpeechRecognition = webkitSpeechRecognition;
        const SpeechGrammarList = window.webkitSpeechGrammarList;
        const SpeechRecognitionEvent = webkitSpeechRecognitionEvent;
        const recognition = new SpeechRecognition();

        // const colors = ['aqua', 'azure', 'beige', 'bisque', 'black', 'blue', 'brown', 'chocolate', 'coral', 'crimson', 'cyan', 'fuchsia', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'indigo', 'ivory', 'khaki', 'lavender', 'lime', 'linen', 'magenta', 'maroon', 'moccasin', 'navy', 'olive', 'orange', 'orchid', 'peru', 'pink', 'plum', 'purple', 'red', 'salmon', 'sienna', 'silver', 'snow', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'white', 'yellow'];

        // if (SpeechGrammarList) {
        //     const speechRecognitionList = new SpeechGrammarList();
        //     const grammar = '#JSGF V1.0; grammar colors; public <color> = ' + colors.join(' | ') + ' ;'
        //     speechRecognitionList.addFromString(grammar, 1);
        //     recognition.grammars = speechRecognitionList;
        // }
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        // let initialLanguage = 'he-IL'
        //
        let initialLanguage = 'en-US';

        let isTtsActive = false;
        let isSttActive = false;

        recognition.lang = initialLanguage;

        recognition.onresult = async function(event) {
            let[translateFrom,translateTo] = [null, null];
            let utterance = null;
            const speechResult = event.results[event.results.length - 1][0].transcript;
            logger.log('recognition: speechResult', speechResult);

            //extract command from speech - we may want to translate or just to change source language
            const [newTranslateFrom,newTranslateTo] = analyzeText(speechResult);
            //update src and target if exists
            if (newTranslateTo != null && newTranslateFrom != null) {
                translateTo = newTranslateTo;
                translateFrom = newTranslateFrom;
            }
            if (translateTo) {
                //speak out the translation
                const translationResult = await translateText(translateFrom, translateTo, speechResult);

                utterance = new SpeechSynthesisUtterance(translationResult);
                utterance.lang = translateTo;
                utterance.voice = getRandomVoice(translateTo)
                recognition.lang = translateFrom;

                logger.log('update source and target language', {
                    language: translateTo,
                    translationResult
                });
            } else if (translateFrom) {
                //change spoken language
                logger.log('update source language', {
                    language: translateFrom
                });
                recognition.lang = translateFrom;
                utterance = new SpeechSynthesisUtterance(speechResult);
                utterance.lang = translateFrom;
                utterance.voice = getRandomVoice(translateFrom)
            } else {
                logger.log('initial source language')
                utterance = new SpeechSynthesisUtterance(speechResult);
                utterance.lang = initialLanguage;
                utterance.voice = getRandomVoice(initialLanguage)
            }

            //listen always: whenever tts is off
            utterance.onstart = function(ev) {
                isTtsActive = true;
                logger.log('start', {
                    isTtsActive
                })
            }
            utterance.onmark = function(ev) {
                logger.log('onmark', ev)
            }
            ;
            utterance.onboundary = function(ev) {
                logger.info('onboundary', ev)
            }
            ;
            utterance.onresult = function(ev) {
                logger.log('onresult', ev)
            }

            utterance.onerror = function(ev) {
                logger.log('onerror', ev)
            }
            utterance.onspeechend = function(ev) {
                setTtsStatus(false)

                logger.log('onspeechend', ev)
            }
            utterance.onend = function(ev) {
                setTtsStatus(false)
                logger.log('onend', ev)
                restartListening()
            }

            //speak out
            if (utterance.text) {
                logger.info("RESULT", utterance.text)
                // recognition.stop();
                speechSynthesis.speak(utterance)
            }
        }

        // Event handler for errors
        recognition.onerror = function(event) {
            logger.log("Error occurred: " + event.error);
            //   setSttStatus(false)
            restartListening()
        }

        // Event handler for when the recognition ends
        recognition.onspeechend = function() {
            logger.log("Recognition onspeechend");

        }
        recognition.onend = function() {
            logger.log("Recognition ended");
            setSttStatus(false)
            // Start the recognition again if TTS is not active
            restartListening()

        }

        recognition.onstart = ()=>{
            logger.log('onstart recognition')

            setSttStatus(true)
        }

        //will occure once per runtime
        recognition.start();

        function setSttStatus(value) {
            // ;utterance = null;
            isSttActive = value;
            logger.log('setSttStatus', {
                isTtsActive
            })
        }
        function setTtsStatus(value) {
            // ;utterance = null;
            isTtsActive = value;
            logger.log('setTtsStatus', {
                isTtsActive
            })
        }
        function restartListening() {
            if (idTimout) {
                logger.log('kill idTimout', idTimout)
                clearTimeout(idTimout)
            }
            logger.log('restartListening', new Date().getSeconds(), {
                isSttActive
            }, {
                isTtsActive
            })

            if (!isTtsActive && !isSttActive) {
                logger.log('stt,tts are not active, start listen', ++counter);
                if (!speechSynthesis.speaking) {
                    recognition.start();
                }
            } else {
                idTimout = setTimeout(restartListening, 1000)
            }

        }
    }).catch((err)=>{
        console.error(`The following getUserMedia error occurred: ${err}`);
    }
    );
}
function option2() {
    return navigator.mediaDevices.getUserMedia({
        audio: true
    }).then(function(stream) {
        return new Promise((resolve,reject)=>{
            const SpeechRecognition = webkitSpeechRecognition;

            const recognition = new SpeechRecognition();

            recognition.interimResults = false;
            recognition.continuous = false;
            recognition.maxAlternatives = 1;
            let initialLanguage = 'en-US';

            recognition.lang = initialLanguage;
            recognition.onresult = (event)=>{
                // recognition.abort()
                const speechResult = event.results[event.results.length - 1][0].transcript;
                logger.info('recognition: speechResult', speechResult);

                resolve(speechResult)
            }
            recognition.onerror = (ev)=>{
                console.error(ev)
                resolve(' recognition.onerror ')
            }
            const utterance = new SpeechSynthesisUtterance('please speak');
            utterance.lang = 'en-US';

            utterance.onend = ()=>{
                recognition.start()
            }

            speechSynthesis.speak(utterance);

        }
        )

    }).catch((err)=>{
        console.error(`The following getUserMedia error occurred: ${err}`);
    }
    );

}

// const x = option2().then((speechResult)=>{
//     return new Promise((resolve, reject)=>{

//         logger.log('speak:', speechResult)
//     const utterance = new SpeechSynthesisUtterance(speechResult);
//     utterance.lang = 'en-US';
//     utterance.onerror = (ev)=>{
//         logger.log('option2', ev)
//         reject(av)
//     }
//     utterance.onresult = (ev)=>{
//         logger.log('option2', ev)
//     }
//     utterance.onend = (ev)=>{
//         logger.log('option2', ev)
//         resolve(ev)
//     }
//     speechSynthesis.speak(utterance);
//     })

// }
// ).catch(console.error)
// x.then(option1)
// document.querySelector("body").addEventListener('click',option1)
try {
    console.info('start option1')
    option1()
} catch (e) {
    console.error(e.message)
}
