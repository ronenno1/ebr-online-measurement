function init_minno_mesh(global) {
    global.container = document.createElement('container');
    global.canvas_div = document.createElement('div');

    global.canvas_div.style["margin-left"]  =  'auto';
    global.canvas_div.style["margin-right"] =  'auto';
    global.canvas_div.style.position        = 'absolute';
    global.canvas_div.style.bottom          = "0";

    global.full_video               = document.createElement('video');
    global.full_video.className     = "input_video";
    global.full_video.width         = "1280px";
    global.full_video.height        = "720px";
    global.full_canvas              = document.createElement('canvas');
    global.full_canvas.className    = "output_canvas";
    global.full_canvas.width        = 256;
    global.full_canvas.height       = 144;

    global.full_canvas.style.display    = 'block';
    global.full_canvas.style["margin"]  = 'auto';

    global.canvas_div.appendChild(global.full_video);
    global.container.appendChild(global.canvas_div);
    global.container.appendChild(global.full_canvas);
    document.body.appendChild(global.container);

    global.videoElement = document.getElementsByClassName('input_video')[0];
    global.eye_data     = [];
    global.start_recording  = start_recording;
    global.stop_recording   = stop_recording;
    global.stopVideo        = stop_video;
    global.get_all          = get_all;
    global.get_all_bins     = get_all_bins;
    global.get_validity     = get_validity;

    global.detectionNeeded = false;
    global.faceMesh = new FaceMesh({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }});
    global.faceMesh.setOptions({
          maxNumFaces: 1,
          selfieMode: true,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
    });
    global.faceMesh.onResults(parse_data, global);
    
    global.camera = new Camera(global.videoElement, {
          onFrame: async () => {
              if (global.stop_me)
                  return;
                await global.faceMesh.send({image: global.videoElement});
          },
          width: 1280,
          height: 720
    });
    global.camera.start();
    global.stop_me = false;
    
function parse_data(results) {
        const canvasElement = document.getElementsByClassName('output_canvas')[0];
        const canvasCtx     = canvasElement.getContext('2d');

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.strokeStyle = "#00ff00";
        canvasCtx.lineWidth   = 5;
        canvasCtx.strokeRect(0.3*global.full_canvas.width, 0.1*global.full_canvas.height, 0.4*global.full_canvas.width, 0.8*global.full_canvas.height);

        if (global.detectionNeeded && results.multiFaceLandmarks) {
            if(results.multiFaceLandmarks.length==0){
                canvasCtx.lineWidth     = 5;
                canvasCtx.strokeStyle   = "#ff0000";
                canvasCtx.strokeRect(0.3*global.full_canvas.width, 0.1*global.full_canvas.height, 0.4*global.full_canvas.width, 0.8*global.full_canvas.height);
            }
             global.samples_counter++;

              for (const landmarks of results.multiFaceLandmarks) {


                const vertices  = FACEMESH_FACE_OVAL.flatMap(num => num);
                const ratio     = Math.round(100*calcratio(landmarks));

                global.samples_valid_counter++;
                
                global.eye_data.push({t: new Date().getTime(), ratio});
                if (landmarks[33].x<0.31 || landmarks[263].x>0.69 || 
                    landmarks[33].y<0.21 || landmarks[263].y<0.21 ||
                    landmarks[33].x>0.79 || landmarks[263].x>0.79){
                    canvasCtx.strokeStyle = "#ff0000";
                    canvasCtx.strokeRect(0.3*global.full_canvas.width, 0.1*global.full_canvas.height, 0.4*global.full_canvas.width, 0.8*global.full_canvas.height);
                }
            }
        }
        canvasCtx.restore();
    }
}
    function pythagoras(pointA, pointB){
      return Math.sqrt(Math.pow(pointA.x-pointB.x, 2) + Math.pow(pointA.y-pointB.y, 2));
    }
    function calcratio(landmarks) {
        var left = (pythagoras(landmarks[385], landmarks[380])+pythagoras(landmarks[387], landmarks[373]))/(2*pythagoras(landmarks[362], landmarks[263]));
        var right = (pythagoras(landmarks[160], landmarks[144])+pythagoras(landmarks[158], landmarks[153]))/(2*pythagoras(landmarks[33], landmarks[133]));
        return 0.5*(left+right);
    }


    function get_all_bins(global, bins_size = 100) {

        var data4ana = global.eye_data;
        
        var data_times  = data4ana.map(sample=>sample.t);
        data_times      = data_times.map(t=> t-data_times[0]);
        var data_ratio  = data4ana.map(sample=>sample.ratio);

        var mean_ratio  = calc_mean(data_ratio);
        var std_ratio   = calc_std(data_ratio);
        
        var mean_sampling_rate  = Math.round(1000/calc_mean(calc_diff(data_times)));
        var data_ratio_diff     = calc_diff(data_ratio);
        var max_diff            = Math.max.apply(null, data_ratio_diff);
        var min_diff            = Math.min.apply(null, data_ratio_diff);
        var data_ratio          = data_ratio.map(v=>v<mean_ratio-(std_ratio) ? 0 : v);

        data_ratio = smooth(data_ratio);
        data_ratio = data_ratio.map(v=>v>0 ? 1 : 0);
        
        var data_ratio_diff = calc_diff(data_ratio);
        var onset_cands     = data_ratio_diff.map((e,i)=>e==-1 ? -i : 0).filter(v=>v!=0);
        var offset_cands    = data_ratio_diff.map((e,i)=>e==1 ? i : 0).filter(v=>v!=0);

        var candidates = onset_cands.concat(offset_cands).sort((a, b)=>Math.abs(a) - Math.abs(b));
        if (candidates.length && candidates[0] >0)
            candidates = [0].concat(candidates);
        if (candidates.length && candidates[candidates.length-1] <0)
            candidates = candidates.concat([data_ratio.length-1]);

        var blink_id     = 0;
        var blink_onset  = 0;
        var blink_offset = 0;
        var all_p2 = [];
        var all_p3 = [];
        var p2 = 0;
        var p3 = 0;

        while (blink_id<candidates.length){
            blink_onset = Math.abs(candidates[blink_id]);
            all_p2      = data_ratio_diff.slice(0, blink_onset).map((e, i)=>e>min_diff/1000 ? i : '').filter(String);
            p2          = all_p2[all_p2.length-1];
            
            blink_offset = candidates[blink_id+1];
            all_p3       = data_ratio_diff.slice(blink_offset).map((e, i)=>(e<0) ? i : '').filter(String);
            p3           = all_p3[0]+blink_offset;
            data_ratio   = data_ratio.map((v, i)=>(i>=p2&&i<=p3) ? 0 : v);
            
            blink_id = blink_id + 2;
        }
        
        var num_of_bins     = Math.floor(data_times[data_times.length-1]/bins_size);
        var bin_id          = 0;
        var bin_samples     = [];
        var bin_total_data  = [];
        
        for(let bin_id = 0; bin_id < num_of_bins; bin_id++){
            var indices             = data_times.map((e, i) => e>=(bin_id)*bins_size && e<(bin_id+1)*bins_size ? i : '').filter(String);
            var bin_data            = data_ratio.filter((e, i)=>indices.includes(i));
            bin_total_data[bin_id]  = calc_mean(bin_data)<1 ? 0 : 1;
        }
        
        console.log(bin_total_data.map(e=>1-e).join(''));
        return '*'+bin_total_data.map(e=>1-e).join('');

    }


function get_all(global) {
        return global.eye_data;
    }

    function get_validity(global) {
        return (global.samples_valid_counter/global.samples_counter);

    }

    function start_recording(global) {
        global.detectionNeeded = true;
        global.eye_data = [];
        global.samples_counter = 0;
        global.samples_valid_counter = 0;

    }
    function stop_recording(global) {
        global.detectionNeeded = false;
    }

    function stop_video(global) {
        global.stop_me = true;
        global.detectionNeeded = false;
        document.body.removeChild(global.container);
        global.camera.stop();
        global.camera = false;
        global.minno_mesh = false;
    }


function  calc_std (arr, usePopulation = false){
  // Calculate the mean of the array
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
  
  // Calculate the sum of squared differences from the mean
  const sumOfSquaredDifferences = arr.reduce((acc, val) => acc.concat((val - mean) ** 2), [])
                                      .reduce((acc, val) => acc + val, 0);
  
  // Calculate the standard deviation
  return Math.sqrt(sumOfSquaredDifferences / (arr.length - (usePopulation ? 0 : 1)));
};


function calc_mean(arr){
    if (arr.length===0)
        return NaN;
    else
        return arr.reduce((a, b) => a + b) / arr.length
}

function smooth(arr){
    return arr.map(function(n, i) { 
        if (i==0)
            return (n + arr[i+1])/2;
        if (i==arr.length-1)
            return (n + arr[i-1])/2;
        return (n + arr[i-1] + arr[i+1])/3; 
    });
}

function calc_diff(arr) {
  return arr.slice(1).map(function(n, i) { return n - arr[i]; });
}

