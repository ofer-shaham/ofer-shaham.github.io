let counter = 0
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
        src = 'en-US'
    } else if (speechResult.toLowerCase().includes("show commands")) {
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

    // let initialLanguage ='he-IL'//
    let initialLanguage = 'en-US';

    let utterance = null;

    let[translateFrom,translateTo] = ['', ''];
    let isTtsActive = false;
    let isSttActive = false;

    recognition.lang = initialLanguage;

    recognition.onresult = async function(event) {
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
        } else {
            console.log('initial source language')
            utterance = new SpeechSynthesisUtterance(speechResult);
            utterance.lang = initialLanguage;
        }

        //listen only whenever tts is off
        utterance.onstart = function(ev) {

            isTtsActive = true;
            console.log('start', {
                isTtsActive
            })
            recognition.stop();

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
        }

        // Event handler for errors
        recognition.onerror = function(event) {
            console.log("Error occurred: " + event.error);
            setSttStatus(false)
            restartListening()
        }

        // Event handler for when the recognition ends
        recognition.onend = function() {
            console.log("Recognition ended");
            setSttStatus(false)
            // Start the recognition again if TTS is not active
            restartListening()

        }

        recognition.onstart = ()=>{
            console.log('onstart recognition')

            isSttActive = true;
        }

        //speak out
        speechSynthesis.speak(utterance)

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
    function restartListening() {
        console.log('restartListening', new Date().getSeconds(), {
            isSttActive
        }, {
            isTtsActive
        })

        if (!isTtsActive && !isSttActive) {
            isSttActive = true;
            console.log('stt,tts are not active, start listen', ++counter);
            ;recognition.start();
        } else {
            setTimeout(restartListening, 1000)
        }

    }
}

option1();
