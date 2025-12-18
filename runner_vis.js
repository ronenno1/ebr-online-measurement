define(['managerAPI', 'minno_mesh.js'], function (Manager, minno_mesh) {

	var API         = new Manager();

	// ---- MediaPipe loader: prevent RequireJS "mismatched anonymous define" ----
    // Key idea: MediaPipe's WASM glue sometimes registers an *anonymous* AMD module.
    // In a RequireJS page (Minno), that can crash on the second init.
    // Fix: remove the AMD marker (define.amd) once, permanently, before MediaPipe/WASM runs.
	if (window.define && window.define.amd) {
      try {
        delete window.define.amd;
      } catch (e) {
        window.define.amd = undefined;
      }
    }
    
    // Load external scripts once (plain script tags, not RequireJS).
    function loadScriptOnce(url) {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    
    // Promise that resolves once MediaPipe is available on window.
    if (!window.MEDIAPIPE_READY) {
      window.MEDIAPIPE_READY = (async () => {
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
        if (!window.FaceMesh) throw new Error('MediaPipe loaded but window.FaceMesh is missing.');
      })();
    }


	
    var instStyle   = "font-size:20px; text-align:middle;  margin-right:10px; font-family:arial";
    var global      = API.getGlobal(); 
	init_data_pipe(API, 'UAckahgsCaWH',  {file_type:'csv'});	

    global.init_minno_mesh  = init_minno_mesh;

    var noticeInst = 'At the bottom, you can see what your webcam shows. </br>' + 
        'Your face must be in the middle of the square for our software to detect your eyes. </br>' + 
        'If the frame is green, your eyes are well detected. If the frame is red, there is a problem detecting your eyes. </br>'+
        'Please ensure that only one person <b>(you)</b> is in front of the screen during the experiment';

     var MainInst = '<p>Your task is to blink with your eyes as quickly as possible when the color of the cross was swiched to red (<font style color="red">+</font>).</br></p>'+
                    '<p style="font-weight: bold;">Please look at the centre of the screen throughout the experiment.</p></br>'+
                     '<br/>' + 
	                noticeInst ;
	                
     var MainIns_m = '<p>Your task is to click on the spacebar as quickly as possible when the color of the cross was swiched to red (<font style color="red">+</font>).</br></p>'+
                    '<p style="font-weight: bold;">Please look at the centre of the screen throughout the experiment.</p></br>'+
                     '<br/>' + 
	                noticeInst ;

	API.addTasksSet(
	{
        consent: [{
            type: 'message',

            name: 'consent',
            templateUrl: 'consent.jst',
            title: 'Exp'
        }],
        commit: [{
            type: 'message',
            buttonText: 'continue',
            name: 'commit',
            templateUrl: 'commit.jst',
            title: 'Commit'
        }],
	    subject : 
		[{
			type: 'quest', piTemplate: true, name: 'subject', scriptUrl: 'subject.js'
		}],
        uploading: uploading_task({title: 'Data Upload in Progress', header: 'Data Upload in Progress', body:'Please wait while your data is securely uploaded to the server. You can exit the experiment once the upload is complete.', buttonText: 'Exit the Experiment'}),

		vis_task :
		[{
			type: 'time', name: 'vis_task', scriptUrl: 'EBR_VIS.js' , 
			current: {
			    myID:'vis_task',
			    maxTimeoutsInBlock:8,
			    maxFailedBlocks:2,
			    num_of_prac_trials:10,      // 3
                minScore4exp: 8,            // 0
			    num_of_trials:3,            // 80X3=240
			    blockInst: [
    	            '<div style="'+instStyle+'"><color="red">' +
                        '<p>In this part of the experiment you will be presented with black crosses (+).</p>'+
                            MainIns_m+ 
                        '<p>Please press the spacebar to continue</p>'+ 
                    '</div>',
			        ////////////////////////////////////////////////////////
		            '<div style="'+instStyle+'"><color="#000000">' +
		                '<p><b>This part of the experiment is done.</b></p>'+ 
		                '<p><b>In the next part, the instructions will be a bit different.</b></p>'+ 

                        '<p>Please press the spacebar to continue.</p>'+
                    '</div>',
			        ////////////////////////////////////////////////////////
    	            '<div style="'+instStyle+'"><color="red">' +
                        '<p>In this part of the experiment you will be presented with black crosses (+).</p>'+
                            MainInst+ 
                        '<p>Please press the spacebar to continue</p>'+ 
                    '</div>',
			            
			        ////////////////////////////////////////////////////////
   		            '<div style="'+instStyle+'"><color="#000000">' +
		                '<p>The experiment is over.</p>'+ 
                      '<p>Thank you very much for you participation.</p>'+
                      '<p>Please press the spacebar to end the experiment.</p>'+
                    '</div>'
		        ]
			}
		}]
	});

    //define the sequence of the study
    API.addSequence([
        // {inherit: 'consent'},
        // {inherit: 'commit'},
        // {inherit: 'subject'},
        {inherit: 'vis_task'},
        {inherit: 'uploading'}
	]);
	return API.script;
});
