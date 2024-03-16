let counter = 0
let idTimout = null

function showLanguages() {
    const createLanguageMap = ()=>{
        const languageMap = {};
        const voices = speechSynthesis.getVoices();
        voices.forEach((voice)=>{
            const languageName = voice.name.split(' ')[1];
            // Extract the language name from the voice name
            languageMap[languageName] = voice.lang;
            // Add the language name and code to the language map object
        }
        );

        console.log(languageMap);
        // Output: { "Deutsch": "de-DE" }
        return languageMap
    }
    const languageMap = createLanguageMap()
    console.log({
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

    console.log({
        url
    });

    try {
        const response = await fetch(url);
        const data = await response.json();
        const translatedText = data[0][0][0];
        console.log(`Translated text: ${translatedText}`);
        return translatedText;
    } catch (error) {
        console.error('Error translating text:', error);
        return 'error';
    }
}

function setTranslationLanguage(userInput) {
    const pattern = /translate\s+from\s+(\w+)\s+to\s+(\w+)/i;
    let translateFrom = '';
    let translateTo = '';
    const matches = userInput.match(pattern);

    if (matches) {
        translateFrom = matches[1];
        translateTo = matches[2];
    }

    return [translateFrom, translateTo];
}

function analyzeText(speechResult) {
    let translateFrom = '';
    let translateTo = '';

    let src = '';
    let trg = '';

    console.log("analyzeText   " + speechResult);

    if (speechResult.toLowerCase().includes("speak english")) {
        console.log('back to english')
        translateFrom = 'en-US'
        translateTo=''
    } 
   else if (speechResult.toLowerCase().includes("show languages")) {
            showLanguages()
        }
else if (speechResult.toLowerCase().includes("show commands")) {
        console.log("translate from X to Y")
        console.log("change language to X")
        console.log('speak english')
    } else if (speechResult.toLowerCase().includes("translate from")) {
        [translateFrom,translateTo] = setTranslationLanguage(speechResult);
    } else if (speechResult.toLowerCase().includes("change language to")) {
        translateFrom = speechResult.toLowerCase().replace("change language to", "").trim();
        console.log("Language Updated: " + translateFrom);
    }

    console.log([{
        translateFrom
    }, {
        translateTo
    }]);

    try {
        if (translateFrom)
            src = mapLanguageNameToCode(translateFrom);
        if (translateTo)
            trg = mapLanguageNameToCode(translateTo);
    } catch (e) {
        console.error(e.message);
    }
    console.log([src, trg])
    return [src, trg];
}

function option1() {
    navigator.mediaDevices.getUserMedia({
        audio: true
    }).then(function(stream) {

        console.log('option1', ++counter)
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

        let[translateFrom,translateTo] = ['', ''];
        let isTtsActive = false;
        let isSttActive = false;

        recognition.lang = initialLanguage;

        recognition.onresult = async function(event) {
            let utterance = null;

            console.log({
                event
            });

            const speechResult = event.results[event.results.length - 1][0].transcript;
            console.log('recognition: speechResult', speechResult);

            //extract command from speech - we may want to translate or just to change source language
            const [newTranslateFrom,newTranslateTo] = analyzeText(speechResult);

            //prefer translation if exists
            if (newTranslateTo) {
                translateTo = newTranslateTo;
            }
            if (newTranslateFrom) {
                translateFrom = newTranslateFrom;
            }

            if (translateTo) {
                //speak out the translation
                const translationResult = await translateText(translateFrom, translateTo, speechResult);

                utterance = new SpeechSynthesisUtterance(translationResult);
                utterance.lang = translateTo;
                utterance.voice = getRandomVoice(translateTo)
                recognition.lang = translateFrom;

                console.log('update source and target language', {
                    language: translateTo,
                    translationResult
                });
            } else if (translateFrom) {
                //change spoken language
                console.log('update source language', {
                    language: translateFrom
                });
                recognition.lang = translateFrom;
                utterance = new SpeechSynthesisUtterance(speechResult);
                utterance.lang = translateFrom;
                utterance.voice = getRandomVoice(translateFrom)
            } else {
                console.log('initial source language')
                utterance = new SpeechSynthesisUtterance(speechResult);
                utterance.lang = initialLanguage;
                utterance.voice = getRandomVoice(initialLanguage)
            }

            //listen only whenever tts is off
            utterance.onstart = function(ev) {

                isTtsActive = true;
                console.log('start', {
                    isTtsActive
                })

            }
            utterance.onmark = function(ev) {
                console.log('onmark', ev)
            }
            ;
            utterance.onboundary = function(ev) {
                console.log('onboundary', ev)
            }
            ;
            utterance.onresult = function(ev) {
                console.log('onresult', ev)
            }

            utterance.onerror = function(ev) {
                console.log('onerror', ev)
            }
            utterance.onspeechend = function(ev) {
                setTtsStatus(false)

                console.log('onspeechend', ev)
            }
            utterance.onend = function(ev) {
                setTtsStatus(false)
                console.log('onend', ev)
restartListening()
            }

            //speak out
            if (utterance.text) {
                // recognition.stop();
                speechSynthesis.speak(utterance)
            }
        }
        
        
        // Event handler for errors
        recognition.onerror = function(event) {
            console.log("Error occurred: " + event.error);
            setSttStatus(false)
            restartListening()
        }

        // Event handler for when the recognition ends
        recognition.onspeechend = recognition.onend = function() {
            console.log("Recognition ended");
            setSttStatus(false)
            // Start the recognition again if TTS is not active
            restartListening()

        }

        recognition.onstart = ()=>{
            console.log('onstart recognition')

            setSttStatus(true)
        }

        recognition.start();

        function setSttStatus(value) {
            // ;utterance = null;
            isSttActive = value;
            console.log('setSttStatus', {
                isTtsActive
            })
        }
        function setTtsStatus(value) {
            // ;utterance = null;
            isTtsActive = value;
            console.log('setTtsStatus', {
                isTtsActive
            })
        }
        async function restartListening() {
            if (idTimout) {
                console.log('kill idTimout', idTimout)
                clearTimeout(idTimout)
            }
            console.log('restartListening', new Date().getSeconds(), {
                isSttActive
            }, {
                isTtsActive
            })

            if (!isTtsActive && !isSttActive) {
                console.log('stt,tts are not active, start listen', ++counter);
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
                console.log('recognition: speechResult', speechResult);

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

//         console.log('speak:', speechResult)
//     const utterance = new SpeechSynthesisUtterance(speechResult);
//     utterance.lang = 'en-US';
//     utterance.onerror = (ev)=>{
//         console.log('option2', ev)
//         reject(av)
//     }
//     utterance.onresult = (ev)=>{
//         console.log('option2', ev)
//     }
//     utterance.onend = (ev)=>{
//         console.log('option2', ev)
//         resolve(ev)
//     }
//     speechSynthesis.speak(utterance);
//     })
    

// }
// ).catch(console.error)
// x.then(option1)
document.querySelector("body").addEventListener('click',option1)

// option1()
