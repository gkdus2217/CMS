import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  updatePassword,
  getAuth,
} from 'firebase/auth';
import {
  getStorage,
  uploadBytesResumable,
  getMetadata,
  ref,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  where,
  or,
  Timestamp,
  updateDoc,
  deleteDoc,
  deleteField,
} from 'firebase/firestore/lite';
import inputFocusEvent from './basic.js';
import { loading, hideLoading } from './loading.js';

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let storage = getStorage(app);
let auth = getAuth();
let db = getFirestore(app);

const saveButton = document.getElementById('employee-submit');
let name = document.getElementById('employee-name');
let email = document.getElementById('employee-email');
let phone = document.getElementById('employee-phone');
let grade = document.getElementById('employee-grade');
let photo = document.getElementById('employee-img');
let uid, urlCheck, storageURL, previewCheck;

// 파라미터값 가져오기
const urlParams = new URL(location.href).searchParams;
const checkUid = urlParams.get('uid');

// uid값이 있다면 input value로 반환 함수 실행
if (checkUid) {
  uid = checkUid;
  employeeUpdate();
}

// 파일 종류 이미지로 한정
photo.accept = '.gif, .jpg, .jpeg, .png, .bmp, .ico, .apng, .svg';

// img preview 추가 함수
function addPreview(target) {
  const imgCont = document.querySelector('.img-container');
  const label = imgCont.querySelector('label');
  const preview = document.createElement('div');
  preview.id = 'employee-preview';
  preview.innerHTML = `
  <button type="button" class="upload-clear">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="icon" viewBox="0 0 24 24"><path d="M21 5h-4v-.874A1.825 1.825 0 0 0 15.174 2.3H8.826A1.825 1.825 0 0 0 7 4.126V5H3a.65.65 0 1 0 0 1.3h1v13.1A2.6 2.6 0 0 0 6.6 22h10.8a2.6 2.6 0 0 0 2.6-2.6V6.3h1A.65.65 0 0 0 21 5M8.3 4.126a.527.527 0 0 1 .526-.526h6.348a.527.527 0 0 1 .526.526V5H8.3zM18.7 19.4a1.3 1.3 0 0 1-1.3 1.3H6.6a1.3 1.3 0 0 1-1.3-1.3V6.3h13.4z" style="fill: var(--color-white);"></path><path d="M9.5 17.65a.65.65 0 0 0 .65-.65v-7a.65.65 0 0 0-1.3 0v7a.65.65 0 0 0 .65.65" style="fill: var(--color-white);"></path><path d="M14.5 17.65a.65.65 0 0 0 .65-.65v-7a.65.65 0 0 0-1.3 0v7a.65.65 0 0 0 .65.65" style="fill: var(--color-white);"></path></svg>
  </button>`;

  // 만약 img Url 값이 있다면 실행
  if (target) {
    preview.style.backgroundImage = `url(${target}`;
    imgCont.removeChild(label);
    imgCont.prepend(preview);
    previewCheck = true;
  }
  //clearEvent 함수 실행 (이벤트 핸들러 장착)
  clearEvent();
}

// 이미지 업로드 시 미리보기
function photoChange(e) {
  const reader = new FileReader();
  reader.onload = ({ target }) => {
    addPreview(target.result);
  };
  reader.readAsDataURL(e.target.files[0]);
}

photo.addEventListener('change', (e) => {
  photoChange(e);
});

// 저장된 데이터 input value로 반환 함수
async function employeeUpdate() {
  loading();
  const q = query(collection(db, 'employee'), where('uid', '==', checkUid));
  const searchUid = await getDocs(q);
  searchUid.forEach((doc) => {
    const employee = doc.data();
    name.value = employee.name;
    email.value = employee.email;
    phone.value = employee.phone;
    grade.value = employee.grade;
    if (employee.imgUrl) {
      addPreview(employee.imgUrl);
      urlCheck = true;
    }
  });
  hideLoading();
}

// 정보 입력 됐는지 확인 (유효성 검사)
function inputCheck(name, email, phone, grade) {
  const user = [name, email, phone, grade];
  let checkResult;
  for (let i = 0; i < user.length; i++) {
    if (!user[i].value) {
      checkResult = false;
      break;
    }
    checkResult = true;
  }
  return new Promise(function (resolve, reject) {
    if (checkResult) resolve();
    else reject('입력되지 않은 정보가 있습니다');
  });
}

// 사진 등록 함수
async function addEmployeePhoto(photoURL, photoVal) {
  // 사진 첨부 했다면
  if (photoVal) {
    photo = photo.files[0];
    // firestore에 imgUrl이 있다면
    if (urlCheck) await deleteObject(photoURL);
    await uploadBytesResumable(photoURL, photo);
    await getDownloadURL(photoURL)
      .then((url) => {
        return (storageURL = url);
      })
      .catch((error) => {
        console.log(error);
      });
  }
}

// 정보 등록/수정 함수
async function addEmployeeInfo(userRef, uid) {
  name = name.value;
  email = email.value;
  phone = phone.value;
  grade = grade.value;
  const date = Timestamp.fromDate(new Date());

  if (checkUid) {
    await updateDoc(userRef, {
      email: email,
      name: name,
      phone: phone,
      grade: grade,
    });
  } else {
    await setDoc(userRef, {
      email: email,
      date: date,
      name: name,
      phone: phone,
      grade: grade,
      uid: uid,
    });
  }
}

// 이미지 URL 정보 등록 함수
async function addEmployeePhotoUrl(userRef, photoVal, storageURL, photoURL) {
  if (photoVal) {
    if (!storageURL) await setDoc(userRef, { imgUrl: storageURL });
    else await updateDoc(userRef, { imgUrl: storageURL });
  } else {
    const q = query(collection(db, 'employee'), where('uid', '==', checkUid));
    const imgDoc = await getDocs(q);
    let img;
    imgDoc.forEach((doc) => {
      const employee = doc.data();
      return (img = employee.imgUrl);
    });
    if (!previewCheck && img && !storageURL) {
      await updateDoc(userRef, { imgUrl: deleteField() });
      await deleteObject(photoURL);
    }
  }
}

// Uid 정보 파라미터로 전송
function urlParameter(uid) {
  if (checkUid) {
    alert('임직원 수정이 완료되었습니다.');
  } else {
    alert('임직원 등록이 완료되었습니다.');
  }
  const form = document.createElement('form');
  form.method = 'get';
  form.action = 'employee_write.html';
  const inputUid = document.createElement('input');
  inputUid.type = 'hidden';
  inputUid.name = 'uid';
  inputUid.value = uid;
  form.appendChild(inputUid);
  document.body.appendChild(form);
  form.submit();
}

saveButton.addEventListener('click', async () => {
  if (!checkUid) uid = self.crypto.randomUUID();
  const photoURL = ref(storage, 'images/' + uid);
  const photoVal = photo.value;
  const userRef = doc(getFirestore(), 'employee', uid);

  inputCheck(name, email, phone, grade)
    .then(async () => {
      await addEmployeePhoto(photoURL, photoVal);
      await addEmployeeInfo(userRef, uid);
      await addEmployeePhotoUrl(userRef, photoVal, storageURL, photoURL);
      urlParameter(uid);
    })
    .catch((error) => {
      alert(error);
    });
});

// preview 이미지 클릭 시 preview 삭제
function clearEvent() {
  const clearButton = document.querySelector('.upload-clear');
  clearButton.addEventListener('click', (e) => {
    previewCheck = false;
    const target = e.target;
    const preview = target.parentElement;
    const imgCont = preview.parentElement;
    imgCont.removeChild(preview);
    const label = document.createElement('label');
    label.setAttribute('for', 'employee-img');
    label.classList.add('img-label');
    label.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="icon" viewBox="0 0 24 24"><path d="M12.65 11.35V4.929a.65.65 0 1 0-1.3 0v6.421H4.929a.65.65 0 1 0 0 1.3h6.421v6.421a.65.65 0 0 0 1.3 0V12.65h6.421a.65.65 0 1 0 0-1.3z" style="fill: var(--color-gray900);"></path></svg>`;
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'employee-img';
    input.name = 'img';
    input.accept = '.gif, .jpg, .jpeg, .png, .bmp, .ico, .apng, .svg';
    input.addEventListener('change', (e) => {
      photoChange(e);
      photo = e.target;
    });
    label.appendChild(input);
    imgCont.prepend(label);
  });
}

// 임직원 수정으로 변경
function employeeEdit() {
  const title = document.querySelector('.container__subtitle');
  const button = document.getElementById('employee-submit');
  if (checkUid) {
    title.innerHTML = '임직원 수정';
    button.innerHTML = '수정';
  }
}
employeeEdit();

// 임직원 삭제
function employeeDelete() {
  const button = document.getElementById('employee-delete');
  button.addEventListener('click', async () => {
    const uid = checkUid;
    const photoURL = ref(storage, 'images/' + uid);
    try {
      const q = query(collection(db, 'employee'), where('uid', '==', uid));
      const imgDoc = await getDocs(q);
      let img;
      imgDoc.forEach((doc) => {
        const employee = doc.data();
        return (img = employee.imgUrl);
      });
      console.log(img);

      if (img) await deleteObject(photoURL);
      const userRef = doc(getFirestore(), 'employee', uid);
      await deleteDoc(userRef);
      alert('삭제가 완료되었습니다.');
      window.location.href = '/employee_list.html';
    } catch (error) {
      console.log(error.code);
    }
  });
}
employeeDelete();
inputFocusEvent();
