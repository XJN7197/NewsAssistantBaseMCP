import React , { useState } from 'react';


const ToDo: React.FC = () => {
    const [listData, setListData] = useState<string[]>([]);
    const [inputData,setInputData] = useState('');

    const addList=()=>{
        setListData( [...listData,inputData]);
        setInputData('');
    };

    const changeInput=(e)=>{
        console.log(e);
    }
  return (
    <div>
        <h1>To do list</h1>
        <div>
            <input onChange={changeInput}></input>
            <button onClick={addList}>增加</button>
        </div>
        <div>

        </div>
    </div>
  );
};

export default ToDo;