# 🧠 ebr-online-measurement

**ebr-online-measurement** (Eye Blink Rate Online Measurement) is a web-based platform designed to measure eye blink rate (EBR) in real time.  
It includes two experimental tasks — one **visual** and one **auditory** — enabling comparison of blink rates under different sensory conditions.

---

## 🎯 Overview

This project provides an accessible, browser-based tool to record and analyze eye blink rate (EBR) during cognitive or perceptual tasks.  
Both tasks use the same blink detection algorithm but differ in the type of presented stimuli:

- 👁️ **Visual Task** — participants are presented with **visual stimuli** while EBR is measured.  
- 🎧 **Auditory Task** — participants are presented with **auditory stimuli** while EBR is measured.

---

## 🚀 Try the Tasks

| Task | Description | Live Link | View Code |
|------|--------------|------------|-----------|
| 👁️ **Visual Task** | Measures EBR during exposure to visual stimuli | [Start Visual Task](https://ronenno1.github.io/ebr-online-measurement/vis.html) | [View Code](https://github.com/ronenno1/ebr-online-measurement/blob/main/EBR_VIS.js) |
| 🎧 **Auditory Task** | Measures EBR during exposure to auditory stimuli | [Start Auditory Task](https://ronenno1.github.io/ebr-online-measurement/aud.html) | [View Code](https://github.com/ronenno1/ebr-online-measurement/blob/main/EBR_AUD.js) |

---


## 💻 Running the Experiment

This platform is built using the **Minno** framework for online behavioral experiments — see the official documentation here: https://minnojs.github.io/








For running the experiment, **three main files** are required:

1. **Manager file:** `runner_aud.js` or `runner_vis.js`  
2. **Experiment file:** `EBR_VIS.js` or `EBR_AUD.js`  
3. **Eye blink package:** `minno_mesh.js`  

### Manager File Setup

In addition to defining the sequence of tasks for data collection, the following **basic setups** are required:

**1. Loading required packages**

```javascript
// Eye blink tracking
import 'minno_mesh.js';

// MediaPipe packages
import 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
import 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';

// Optional: Datapipe for OSF data saving
import 'https://cdn.jsdelivr.net/gh/minnojs/minno-datapipe@1.*/datapipe.min.js';

```

**2. Datapipe initialization (if required)**


Datapipe is a platform that supports automatic data upload to the **Open Science Framework (OSF)** using **DataPipe**, an open-source service for securely archiving behavioral experiment data in real time.  
If enabled, each completed session is packaged as a JSON or a CSV file and sent directly from the browser to a linked OSF project via the DataPipe API.  
Learn more here: https://pipe.jspsych.org


```javascript
init_data_pipe(API, 'UAckahgsCaWH', { file_type:'csv' });
// Replace 'UAckahgsCaWH' with your own Datapipe project hashcode
```

**3. Initialize Minno Mesh**
```javascript
global.init_minno_mesh = init_minno_mesh;
```

**4. Uploading task at the end of the experiment (if using Datapipe)**

Because data are uploaded to **OSF** using **DataPipe**, the upload process may take a few moments depending on the participant’s internet connection.  
To ensure that all files are successfully transferred, the platform includes an **uploading step** at the end of the task. During this step, participants are shown a **“please wait”** notification while the data are being sent to OSF.

This waiting screen is essential, as it prevents participants from closing the browser before the upload completes.  
More details about implementing an upload-waiting mechanism can be found in the 
[Minno documentation](https://minnojs.github.io/blog/2023/11/01/running-project-implicits-iat-on-your-own/#waiting-for-the-data-recording).















```javascript
uploading: uploading_task({
    title: 'Data Upload in Progress',
    header: 'Data Upload in Progress',
    body: 'Please wait while your data is securely uploaded to the server. You can exit the experiment once the upload is complete.',
    buttonText: 'Exit the Experiment'
});
// Call this task at the end:
{ inherit: 'uploading' }

```

### Experiment File Setup (`EBR_VIS.js` or `EBR_AUD.js`)

**1. Initialize Minno Mesh at the beginning of the experiment**
```javascript
global.init_minno_mesh(global); // Loads minno_faces components
```

**Start recording at the beginning of each trial**
```javascript
{
    conditions: [{ type:'begin' }],
    actions: [
        { type:'custom', fn: function() { global.start_recording(global); } }
    ]
}
```


**3. End of trial: collect eye blink data**
```javascript
{
    conditions: [{ type:'inputEquals', value:'end' }],
    actions: [
        { type:'hideStim', handle:['All'] },
        { 
            type:'setTrialAttr',
            setter: function(trialData, eventData) {
                trialData.EBR_bins      = global.get_all_bins(global, 50); // Bin size 50 ms
                trialData.EBR           = global.get_all(global);
                trialData.EBR_validity  = global.get_validity(global);
                trialData.SR            = 50; // Bin size in ms
            }
        },
        { type:'custom', fn: function() { global.stop_recording(global); } },
        { type:'log' },
        { type:'endTrial' }
    ]
}
```
### Notes

- `global.get_all` → gets complete eye blink information, including timestamps.  
- `global.get_all_bins(global, 50)` → gets binned data (here 50 ms bins).  
- `global.get_validity` → returns the number of valid samples detected during the trial.  
- Recording stops at the end of the trial and restarts in the next trial as needed.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

### 👤 Author

Developed by *Ronen Hershman*  
📧 Contact: [ronen.hershman@uibk.ac.at]


