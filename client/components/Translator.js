import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, TouchableOpacity, Pressable, Center, Icon} from 'react-native';
import Voice from 'react-native-voice';
import Tts from 'react-native-tts';
import ResponsePhrasesData from './ReponsePhrasesData'
import AsyncStorage from '@react-native-async-storage/async-storage';
import Context from './Context';
import InitiateCall from './InitiateCall';
import { useNavigation } from '@react-navigation/native';

const Translator = () => {
  const [isListening, setIsListening] = useState(false);
  const [isPhrase,setIsPhrase] = useState(false);
  const [speechResults, setSpeechResults] = useState();
  const [spokenPhrase, setSpokenPhrase] = useState();
  const [silenceTimer, setSilenceTimer] = useState();
  const [doneProcessing, setDoneProcessing] = useState(false);
  const isProcessingRef = useRef(false)
  const websocketRef = useRef(null);
  const [callKeyword, setCallKeyword] = useState("");
  const [sendMessageKeyword, setSendMessageKeyword] = useState("");
  const {isCalling}  = useContext(Context);
  const [startCallByKey, setstartCallByKey ] = useState(false)
  const navigation = useNavigation();

  useEffect(() => {
    console.log("isCalling", isCalling)
    if(isCalling){
      startListening()
    }
    if(!isCalling){
      stopListening()
    }
  }, [isCalling])


  useEffect(() => {
    Voice.onSpeechResults = handleSpeechResults;
    Voice.onSpeechEnd = startVoice;

    Tts.addEventListener('tts-finish', stopVoice);
  
    Tts.setDefaultRate(0.45); // Set speech rate (0.5 is normal; adjust as needed)
    Tts.setDefaultPitch(1.0);

    loadKeywords();
    return () => {
      clearTimeout(silenceTimer);
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    isListening ? startVoice() : stopVoice();
  }, [isListening])

  useEffect(() => {
    if (isListening && speechResults) {
      const keywordRegex = new RegExp(callKeyword, 'i');
      if (keywordRegex.test(speechResults)) {
        setstartCallByKey(true);
        // Stop running the rest of the code and go back to home screen 
        stopListening()
        navigation.navigate('Home');
        return;
      }
      // TODO: If speechResults contains keywords, connect to emergency services, else execute logic below
      if (!isPhrase) {
        clearTimeout(silenceTimer)

        setSilenceTimer(setTimeout(() => {
          if (isListening) {
            setIsPhrase(true);
            isProcessingRef.current = true
            setSpokenPhrase(speechResults);
          }
        }, 1500));
      }
    }
  }, [speechResults])

  useEffect(() => {
    console.log(spokenPhrase)
    if (isListening && spokenPhrase && isProcessingRef.current) {
      websocketRef.current.send(spokenPhrase)
      const phrase = getRandomPhrase()
      speakText(phrase);
      isProcessingRef.current =false
    }
  }, [spokenPhrase])

 useEffect(() => {
    if(isListening && doneProcessing){
      isProcessingRef.current =true
    }
  }, [doneProcessing])



const stopVoice = async () => {
  if(isProcessingRef.current ==false){
    setDoneProcessing(true)
  }
  else{
    await Voice.stop();
  }
}
  const startListening = () => {
    console.log("started listening");
    //wss://fake-phone-call.onrender.com
    //ws://0.0.0.0:8080
    websocketRef.current = new WebSocket('wss://fake-phone-call.onrender.com');
      websocketRef.current.onopen = () => {
        console.log('WebSocket connected');
      };
    websocketRef.current.onmessage = (event) => {
      const response = event.data;
      console.log('Received response from WebSocket:', response);
      speakText(response);
    };
    setIsListening(true);
  };

  const stopListening = () => {
    setIsListening(false)
    console.log("stopped listening");
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
      console.log('WebSocket disconnected');
    }
  };

  const startVoice = async () => {
    setTimeout(async()=>{
      console.log("calling start")
      setSpeechResults(undefined);
      setSpokenPhrase(undefined);
      setIsPhrase(false);
      setDoneProcessing(false);
      isProcessingRef.current =false;
      await Voice.isAvailable();
      await Voice.start('en-US');
    }, (500))  
  }


  const handleSpeechResults = (event) => {
    setSpeechResults(event.value[0]);
  }

  const speakText = (text) => {
    try {
      Tts.speak(text);
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  };


  const getRandomPhrase = () => {
    const responsePhrases = ResponsePhrasesData(); 
    const randomIndex = Math.floor(Math.random() * responsePhrases.length);
    return responsePhrases[randomIndex];
  };


  const loadKeywords = async () => {
    try {
      const callKeywordValue = await AsyncStorage.getItem('callKeyword');
      const sendMessageKeywordValue = await AsyncStorage.getItem('sendMessageKeyword');

      if (callKeywordValue !== null) {
        setCallKeyword(callKeywordValue);
      }

      if (sendMessageKeywordValue !== null) {
        setSendMessageKeyword(sendMessageKeywordValue);
      }
    } catch (error) {
      console.log('Error loading keywords from AsyncStorage:', error);
    }
  };

  return (
    <View>
      {startCallByKey && <InitiateCall startCall={true} />}
    </View>
  );
 
};

export default Translator;