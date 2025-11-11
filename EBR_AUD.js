define(['timeAPI','underscore'], function(APIconstructor, _) {
    document.body.style.cursor='none';

    var API     = new APIconstructor();
    var global  = API.getGlobal();
    global.audio = new Audio('tone.mp3');

    var current = API.getCurrent();
    var height = window.screen.height*0.2;
    global.init_minno_mesh(global); // This function load minno_faces components

    var defaultObj = {
        instStyle :  "font-size:24px; text-align:center; margin-left:10px; color:#000000; margin-right:10px; font-family:arial",
    	baseURL : '',
        times: {
            fixation_duration : 400,
            iti_duration      : 2000
        },
        timeouts              : 0, 
        failedBlocks          : 0,
        canvas : {
            textSize         : 5,
            maxWidth         : 1200,
            proportions      : 0.65,
            cursor           : 'none',
            borderWidth      : 0.1,
            background       : '#FFFFFF',
            canvasBackground : '#FFFFFF'	
        }
    };

	_.defaults(current, defaultObj);
    API.addSettings('canvas', current.canvas);

    /***********************************************
    // Media
     ***********************************************/
     
    /*
        group1MediaSets is an object with all the media sets that will considered group1. 
        We will create a media set (group1Media) that is comprised of media that inherit exRandomly from each media set. 
        Then, when we inherit exRandomly from that set, we will get one from mediaSet before getting another one from any of 
        the other mediaSets. This will allow us to present an equal number of photos from each mediaSet in each group.
    */ 

    /***********************************************
    // Stimuli
     ***********************************************/
    API.addStimulusSets({
        defaultStim    : [{css:{cursor:'none', color:'#000000', 'font-size':'2.5em'}, nolog:true}],
        fixation       : [{inherit:'defaultStim', media: '+', handle:'fixation'}],
        error          : [{inherit:'defaultStim', media: 'Incorrect!', handle:'error'}],
        correct        : [{inherit:'defaultStim', media: 'Correct!', handle:'correct'}], 
        timeoutmessage : [{inherit:'defaultStim', media: 'Respond faster!', handle:'timeoutmessage'}], 
        reminder       : [{inherit:'defaultStim', media: '<%=trialData.reminder%>', css:{color:'blue', cursor:'none', 'font-size':'1em'}, location:{bottom:1}, handle:'reminder'}]
    });

    API.addTrialSets('silentEnd',
    {
	    data:{onFail:true},
	    interactions: [
			{ // begin trial
				conditions: [{type:'begin'}],
				actions: [
                    {type:'custom',fn: function(){
                        global.stopVideo(global);
                    }},
				    {type:'endTrial'}
				]
			}
		]
    });

    /***********************************************
    // INSTRUCTIONS TRIAL
     ***********************************************/    

	//Define the instructions trial
	API.addTrialSets('inst',{
	    data : {block:0},
		input: [
			{handle:'space',on:'space'} //Will handle a SPACEBAR response

		],
		interactions: [
			{ // begin trial
				conditions: [{type:'begin'}],
				actions: [{type:'showStim',handle:'All'}] //Show the instructions
			},
			{
				conditions: [{type:'inputEquals',value:'space'}], //What to do when space is pressed
				actions: [
					{type:'hideStim',handle:'All'}, //Hide the instructions
					{type:'setInput',input:{handle:'endTrial', on:'timeout',duration:500}} //In 500ms: end the trial. In the mean time, we get a blank screen.
				]
			},
			{
				conditions: [{type:'inputEquals',value:'endTrial'}], //What to do when endTrial is called.
				actions: [
					{type:'endTrial'} //End the trial
				]
			}
		]
	});

    /***********************************************
    // Main trials
     ***********************************************/

    API.addTrialSets('endOfPractice',{
        input: [ 
			{handle:'end', on: 'timeout', duration: 0}
        ],
        interactions: [
            {
                conditions: [
                    {type:'custom',fn: function(){return !global.current.score || global.current.score < current.minScore4exp;}}
                ],
                actions: [
                    {type:'custom',fn: function(){global.current.score=0;}},

                    {type:'endTrial'}				
                ]
            },  
            {
                conditions: [ 
                    {type:'custom',fn: function(){return global.current.score >= current.minScore4exp;}}
                ],
                actions: [
                    {type:'goto',destination: 'nextWhere', properties: {exp:true}},
                    {type:'endTrial'}				
                ]
            }
        ]
    });
    
    API.addTrialSets('main',[{ 
        data: {score:0},
        layout: [{inherit:'reminder'}],
		input: [
			{handle:'skip1',on:'keypressed', key:27} //Esc + Enter will skip blocks
		],
        interactions: [
            { 
                conditions: [{type:'begin'}],
                actions: [
                    {type:'custom',fn: function(){global.start_recording(global);}},
                    {type:'showStim', handle:'fixation'},
                    {type:'trigger', handle:'gap', duration: '<%= global.current.times.fixation_duration %>'}

                ]
            }, 
            {
                conditions:[{type:'inputEquals',value:'gap'}],
                actions: [
                    {type:'hideStim', handle:'fixation'}, 
                    {type:'trigger', handle:'showTarget', duration: '<%= trialData.presentation_time - global.current.times.fixation_duration%>'}
                ]
            },

            {
                conditions:[{type:'inputEquals',value:'showTarget'}],
                actions: [
                    {type:'hideStim', handle:'fixation'}, 
                    {type:'custom', fn: function(a, b, trial){
                        global.audio.play();
                    }},
				    {type:'setInput', input:{handle:'space',on:'space'}},
                    {type:'resetTimer'},
                    {type:'trigger',handle:'timeout', duration: '<%= global.current.times.fixation_duration %>'}
                ]
            },
           

            {
                conditions: [
                    {type:'inputEquals', value:["space"]}, 
                    {type:'inputEqualsTrial', property:'correctKey'},
                    {type:'trialEquals', property:'block', value:'practice', negate:true}
                  ],
                actions: [
                    {type:'removeInput', handle:['All']},
                    {type:'setTrialAttr', setter:{score:1}},
                    {type:'log'},
                    {type:'trigger', handle:'ITI'}
                ]
            }, 
            
         
         
            {
                conditions: [
                    {type:'inputEquals', value:["space"]}, 
                    {type:'inputEqualsTrial', property:'correctKey', negate:true}
                  ],
                actions: [
                    {type:'removeInput', handle:['All']},

                    {type:'setTrialAttr', setter:{score:0}},
                    {type:'custom', fn: function(a, b, trial){return trial.data.RT = Date.now()-current.start_time;}},
                    {type:'log'},
                    {type:'trigger', handle:'ITI'}

                ]
            }, 
           
            {
                conditions: [
                    {type:'inputEquals',value:'timeout'},
                ],
                actions: [
                    {type:'removeInput', handle:['All']},
                    {type:'hideStim', handle:['All']},

                    {type:'setTrialAttr', setter:{score:-1}},
                    {type:'log'},

                    {type:'custom',fn: function(){
                        current.timeouts++;
                    }},
                    {type:'trigger', handle:'ITI'}

                ]
            },
            
           {
                conditions: [{type:'inputEquals', value:'ITI'}],
                actions:[
                    {type:'removeInput', handle:['All']},
                    {type:'hideStim', handle:['All']},

                    {type:'trigger', handle:'end',duration:'<%= global.current.times.iti_duration %>'}
                ]
            },

            {
                conditions: [{type:'inputEquals', value:'end'}],
                actions: [
                    {type:'hideStim', handle:['All']},
                    {type:'setTrialAttr',setter:function(trialData, eventData){
                        trialData.EBR_bins      = global.get_all_bins(global, 50);
                        trialData.EBR           = global.get_all(global);
                        trialData.EBR_validity  = global.get_validity(global);
                        
                        trialData.SR            = 50;
                        if (global.current.trial_id<10){
                            global.current.trial_id++; 
                            global.current.EBR_invalidity = global.current.EBR_invalidity+(1-(trialData.EBR_validity>0.5));
                        }
                    }},
                    {type:'custom',fn: function(){global.stop_recording(global);}},
                    {type:'log'},
                    {type:'endTrial'}
                ]
            },
			// skip block
			{
				conditions: [{type:'inputEquals',value:'skip1'}],
				actions: [
					{type:'setInput',input:{handle:'skip2', on:'enter'}} // allow skipping if next key is enter.
				]
			},
			// skip block
			{
				conditions: [{type:'inputEquals',value:'skip2'}],
				actions: [
					{type:'goto', destination: 'nextWhere', properties: {blockStart:true}},
					{type:'endTrial'}
				]
			}
        ],
        stimuli : [
            {inherit:'error'},
            {inherit:'correct'},
            {inherit:'timeoutmessage'},
            {inherit:'fixation'}
        ]
    }]);

    /***********************************************
    // Specific trials
     ***********************************************/
    API.addTrialSet('stimulus_trial', {
        inherit: {set:'main', merge:['stimuli']},
        stimuli: [
            { media: '+', css:{cursor:'none', 'font-size':'2.5em', color:'red'}, handle:'target'}
        ]
    });

    var trials = [];

    trials.push({inherit: 'stimulus_trial', data: {presentation_time:500}});
    trials.push({inherit: 'stimulus_trial', data: {presentation_time:1000}});
    trials.push({inherit: 'stimulus_trial', data: {presentation_time:1500}});

    API.addTrialSet('trials', trials);
    var tasks = API.shuffle(['trials_200', 'trials_400']);
    /***********************************************
    // Sequence
     ***********************************************/
    var sequence = [];
    //First block is the manual

    sequence.push({
        mixer:'wrapper',
        data : [
            {
    		    inherit: {set:"inst", merge:['stimuli']}, 
    		    stimuli:[{media:{html:current.blockInst[0]}, location:{top:'113px'}}]
            },
            {
    			mixer: 'random',
    			data: [
    				{  
    					mixer: 'repeat',
    					times: global.current.num_of_trials,
    					data: [
                            {inherit:{set:'trials', type:'equalDistribution', n: global.current.num_of_trials*10, seed: 'exp_1'}, data:{block:'exp_1'}}
    					]
    				}
    			]
    		}
        ]
    },
    
    {
	    data: {exp:true},
	    inherit: {set:"inst", merge:['stimuli']}, 
	    stimuli:[{media:{html:current.blockInst[1]}, css:{cursor:'none', color:'black'},  location:{top:'113px'}}]
	},
	{
        mixer:'wrapper',
        data : [
             {
    		    inherit: {set:"inst", merge:['stimuli']}, 
    		    stimuli:[{media:{html:current.blockInst[2]}, location:{top:'113px'}}]
             },
             {
    			mixer: 'random',
    			data: [
    				{  
    					mixer: 'repeat',
    					times: global.current.num_of_trials,
    					data: [
                            {inherit:{set:'trials', type:'equalDistribution', n: global.current.num_of_trials*10, seed: 'exp_2'}, data:{block:'exp_2'}}
    					]
    				}
    			]
    		}
        ]
    },
	{
	    data: {exp:true},
	    inherit: {set:"inst", merge:['stimuli']}, 
	    stimuli:[{media:{html:current.blockInst[3]}, css:{cursor:'none', color:'black'},  location:{top:'113px'}}]
	});
    
    sequence.push({inherit:'silentEnd'});
	API.addSequence(sequence);
	return API.script;
});
