import {useEffect} from 'react';
import {BackHandler} from 'react-native';

export default function useScreenBack(onClose,blocked=false,enabled=true){
 useEffect(()=>{
  if(!enabled)return;
  const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(!blocked)onClose();return true;});
  return()=>subscription.remove();
 },[onClose,blocked,enabled]);
}
