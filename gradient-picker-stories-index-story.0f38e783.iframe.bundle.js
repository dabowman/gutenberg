(globalThis.webpackChunkgutenberg=globalThis.webpackChunkgutenberg||[]).push([[1998],{"./packages/components/src/gradient-picker/index.tsx":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{"use strict";__webpack_require__.d(__webpack_exports__,{Z:()=>__WEBPACK_DEFAULT_EXPORT__});var react__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/react/index.js"),_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./packages/i18n/build-module/index.js"),_wordpress_compose__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__("./packages/compose/build-module/hooks/use-instance-id/index.js"),_circular_option_picker__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__("./packages/components/src/circular-option-picker/index.tsx"),_custom_gradient_picker__WEBPACK_IMPORTED_MODULE_7__=__webpack_require__("./packages/components/src/custom-gradient-picker/index.tsx"),_v_stack__WEBPACK_IMPORTED_MODULE_5__=__webpack_require__("./packages/components/src/v-stack/component.tsx"),_color_palette_styles__WEBPACK_IMPORTED_MODULE_6__=__webpack_require__("./packages/components/src/color-palette/styles.ts"),react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__("./node_modules/react/jsx-runtime.js");const isMultipleOriginArray=arr=>arr.length>0&&arr.every((gradientObj=>{return obj=gradientObj,Array.isArray(obj.gradients)&&!("gradient"in obj);var obj}));function SingleOrigin({className,clearGradient,gradients,onChange,value,...additionalProps}){const gradientOptions=(0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)((()=>gradients.map((({gradient,name,slug},index)=>(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_circular_option_picker__WEBPACK_IMPORTED_MODULE_3__.ZP.Option,{value:gradient,isSelected:value===gradient,tooltipText:name||(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.gB)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Gradient code: %s"),gradient),style:{color:"rgba( 0,0,0,0 )",background:gradient},onClick:value===gradient?clearGradient:()=>onChange(gradient,index),"aria-label":name?(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.gB)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Gradient: %s"),name):(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.gB)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Gradient code: %s"),gradient)},slug)))),[gradients,value,onChange,clearGradient]);return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_circular_option_picker__WEBPACK_IMPORTED_MODULE_3__.ZP.OptionGroup,{className,options:gradientOptions,...additionalProps})}function MultipleOrigin({className,clearGradient,gradients,onChange,value,headingLevel}){const instanceId=(0,_wordpress_compose__WEBPACK_IMPORTED_MODULE_4__.Z)(MultipleOrigin);return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_v_stack__WEBPACK_IMPORTED_MODULE_5__.Z,{spacing:3,className,children:gradients.map((({name,gradients:gradientSet},index)=>{const id=`color-palette-${instanceId}-${index}`;return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(_v_stack__WEBPACK_IMPORTED_MODULE_5__.Z,{spacing:2,children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_color_palette_styles__WEBPACK_IMPORTED_MODULE_6__.A,{level:headingLevel,id,children:name}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(SingleOrigin,{clearGradient,gradients:gradientSet,onChange:gradient=>onChange(gradient,index),value,"aria-labelledby":id})]},index)}))})}function Component(props){const{asButtons,loop,actions,headingLevel,"aria-label":ariaLabel,"aria-labelledby":ariaLabelledby,...additionalProps}=props,options=isMultipleOriginArray(props.gradients)?(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(MultipleOrigin,{headingLevel,...additionalProps}):(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(SingleOrigin,{...additionalProps});let metaProps;if(asButtons)metaProps={asButtons:!0};else{const _metaProps={asButtons:!1,loop};metaProps=ariaLabel?{..._metaProps,"aria-label":ariaLabel}:ariaLabelledby?{..._metaProps,"aria-labelledby":ariaLabelledby}:{..._metaProps,"aria-label":(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Custom color picker.")}}return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_circular_option_picker__WEBPACK_IMPORTED_MODULE_3__.ZP,{...metaProps,actions,options})}function GradientPicker({className,gradients=[],onChange,value,clearable=!0,disableCustomGradients=!1,__experimentalIsRenderedInSidebar,headingLevel=2,...additionalProps}){const clearGradient=(0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)((()=>onChange(void 0)),[onChange]);return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(_v_stack__WEBPACK_IMPORTED_MODULE_5__.Z,{spacing:gradients.length?4:0,children:[!disableCustomGradients&&(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_custom_gradient_picker__WEBPACK_IMPORTED_MODULE_7__.Z,{__experimentalIsRenderedInSidebar,value,onChange}),(gradients.length>0||clearable)&&(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(Component,{...additionalProps,className,clearGradient,gradients,onChange,value,actions:clearable&&!disableCustomGradients&&(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_circular_option_picker__WEBPACK_IMPORTED_MODULE_3__.ZP.ButtonAction,{onClick:clearGradient,children:(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Clear")}),headingLevel})]})}SingleOrigin.displayName="SingleOrigin",MultipleOrigin.displayName="MultipleOrigin",Component.displayName="Component",GradientPicker.displayName="GradientPicker";const __WEBPACK_DEFAULT_EXPORT__=GradientPicker;try{GradientPicker.displayName="GradientPicker",GradientPicker.__docgenInfo={description:"GradientPicker is a React component that renders a color gradient picker to\ndefine a multi step gradient. There's either a _linear_ or a _radial_ type\navailable.\n\n```jsx\nimport { GradientPicker } from '@wordpress/components';\nimport { useState } from '@wordpress/element';\n\nconst myGradientPicker = () => {\nconst [ gradient, setGradient ] = useState( null );\n\nreturn (\n<GradientPicker\n\tvalue={ gradient }\n\tonChange={ ( currentGradient ) => setGradient( currentGradient ) }\n\tgradients={ [\n\t\t{\n\t\t\tname: 'JShine',\n\t\t\tgradient:\n\t\t\t\t'linear-gradient(135deg,#12c2e9 0%,#c471ed 50%,#f64f59 100%)',\n\t\t\tslug: 'jshine',\n\t\t},\n\t\t{\n\t\t\tname: 'Moonlit Asteroid',\n\t\t\tgradient:\n\t\t\t\t'linear-gradient(135deg,#0F2027 0%, #203A43 0%, #2c5364 100%)',\n\t\t\tslug: 'moonlit-asteroid',\n\t\t},\n\t\t{\n\t\t\tname: 'Rastafarie',\n\t\t\tgradient:\n\t\t\t\t'linear-gradient(135deg,#1E9600 0%, #FFF200 0%, #FF0000 100%)',\n\t\t\tslug: 'rastafari',\n\t\t},\n\t] }\n/>\n);\n};\n```",displayName:"GradientPicker",props:{className:{defaultValue:null,description:"The class name added to the wrapper.",name:"className",required:!1,type:{name:"string"}},onChange:{defaultValue:null,description:"The function called when a new gradient has been defined. It is passed to\nthe `currentGradient` as an argument.",name:"onChange",required:!0,type:{name:"(currentGradient: string) => void"}},value:{defaultValue:{value:"'linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)'"},description:"The current value of the gradient. Pass a css gradient string (See default value for example).\nOptionally pass in a `null` value to specify no gradient is currently selected.",name:"value",required:!1,type:{name:"string"}},clearable:{defaultValue:{value:"true"},description:"Whether the palette should have a clearing button or not.",name:"clearable",required:!1,type:{name:"boolean"}},headingLevel:{defaultValue:{value:"2"},description:"The heading level. Only applies in cases where gradients are provided\nfrom multiple origins (ie. when the array passed as the `gradients` prop\ncontains two or more items).",name:"headingLevel",required:!1,type:{name:"enum",value:[{value:"1"},{value:"2"},{value:'"1"'},{value:"3"},{value:"4"},{value:"5"},{value:"6"},{value:'"2"'},{value:'"3"'},{value:'"4"'},{value:'"5"'},{value:'"6"'}]}},asButtons:{defaultValue:{value:"false"},description:"Whether the control should present as a set of buttons,\neach with its own tab stop.",name:"asButtons",required:!1,type:{name:"boolean"}},loop:{defaultValue:{value:"true"},description:"Prevents keyboard interaction from wrapping around.\nOnly used when `asButtons` is not true.",name:"loop",required:!1,type:{name:"boolean"}},"aria-label":{defaultValue:null,description:"A label to identify the purpose of the control.\n@todo [#54055] Either this or `aria-labelledby` should be required",name:"aria-label",required:!1,type:{name:"string"}},"aria-labelledby":{defaultValue:null,description:"An ID of an element to provide a label for the control.\n@todo [#54055] Either this or `aria-label` should be required",name:"aria-labelledby",required:!1,type:{name:"string"}},gradients:{defaultValue:{value:"[]"},description:"An array of objects as predefined gradients displayed above the gradient\nselector. Alternatively, if there are multiple sets (or 'origins') of\ngradients, you can pass an array of objects each with a `name` and a\n`gradients` array which will in turn contain the predefined gradient objects.",name:"gradients",required:!1,type:{name:"GradientsProp"}},__nextHasNoMargin:{defaultValue:{value:"false"},description:"Start opting in to the new margin-free styles that will become the default\nin a future version, currently scheduled to be WordPress 6.4. (The prop\ncan be safely removed once this happens.)\n@deprecated Default behavior since WP 6.5. Prop can be safely removed.\n@ignore",name:"__nextHasNoMargin",required:!1,type:{name:"boolean"}},disableCustomGradients:{defaultValue:{value:"false"},description:"If true, the gradient picker will not be displayed and only defined\ngradients from `gradients` will be shown.",name:"disableCustomGradients",required:!1,type:{name:"boolean"}},__experimentalIsRenderedInSidebar:{defaultValue:{value:"false"},description:"Whether this is rendered in the sidebar.",name:"__experimentalIsRenderedInSidebar",required:!1,type:{name:"boolean"}}}},"undefined"!=typeof STORYBOOK_REACT_CLASSES&&(STORYBOOK_REACT_CLASSES["packages/components/src/gradient-picker/index.tsx#GradientPicker"]={docgenInfo:GradientPicker.__docgenInfo,name:"GradientPicker",path:"packages/components/src/gradient-picker/index.tsx#GradientPicker"})}catch(__react_docgen_typescript_loader_error){}},"./node_modules/gradient-parser/build/node.js":(__unused_webpack_module,exports)=>{var GradientParser={};GradientParser.parse=function(){var tokens={linearGradient:/^(\-(webkit|o|ms|moz)\-)?(linear\-gradient)/i,repeatingLinearGradient:/^(\-(webkit|o|ms|moz)\-)?(repeating\-linear\-gradient)/i,radialGradient:/^(\-(webkit|o|ms|moz)\-)?(radial\-gradient)/i,repeatingRadialGradient:/^(\-(webkit|o|ms|moz)\-)?(repeating\-radial\-gradient)/i,sideOrCorner:/^to (left (top|bottom)|right (top|bottom)|left|right|top|bottom)/i,extentKeywords:/^(closest\-side|closest\-corner|farthest\-side|farthest\-corner|contain|cover)/,positionKeywords:/^(left|center|right|top|bottom)/i,pixelValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))px/,percentageValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))\%/,emValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))em/,angleValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))deg/,startCall:/^\(/,endCall:/^\)/,comma:/^,/,hexColor:/^\#([0-9a-fA-F]+)/,literalColor:/^([a-zA-Z]+)/,rgbColor:/^rgb/i,rgbaColor:/^rgba/i,number:/^(([0-9]*\.[0-9]+)|([0-9]+\.?))/},input="";function error(msg){var err=new Error(input+": "+msg);throw err.source=input,err}function getAST(){var ast=function matchListDefinitions(){return matchListing(matchDefinition)}();return input.length>0&&error("Invalid input not EOF"),ast}function matchDefinition(){return matchGradient("linear-gradient",tokens.linearGradient,matchLinearOrientation)||matchGradient("repeating-linear-gradient",tokens.repeatingLinearGradient,matchLinearOrientation)||matchGradient("radial-gradient",tokens.radialGradient,matchListRadialOrientations)||matchGradient("repeating-radial-gradient",tokens.repeatingRadialGradient,matchListRadialOrientations)}function matchGradient(gradientType,pattern,orientationMatcher){return matchCall(pattern,(function(captures){var orientation=orientationMatcher();return orientation&&(scan(tokens.comma)||error("Missing comma before color stops")),{type:gradientType,orientation,colorStops:matchListing(matchColorStop)}}))}function matchCall(pattern,callback){var captures=scan(pattern);if(captures)return scan(tokens.startCall)||error("Missing ("),result=callback(captures),scan(tokens.endCall)||error("Missing )"),result}function matchLinearOrientation(){return function matchSideOrCorner(){return match("directional",tokens.sideOrCorner,1)}()||function matchAngle(){return match("angular",tokens.angleValue,1)}()}function matchListRadialOrientations(){var radialOrientations,lookaheadCache,radialOrientation=matchRadialOrientation();return radialOrientation&&((radialOrientations=[]).push(radialOrientation),lookaheadCache=input,scan(tokens.comma)&&((radialOrientation=matchRadialOrientation())?radialOrientations.push(radialOrientation):input=lookaheadCache)),radialOrientations}function matchRadialOrientation(){var radialType=function matchCircle(){var circle=match("shape",/^(circle)/i,0);circle&&(circle.style=matchLength()||matchExtentKeyword());return circle}()||function matchEllipse(){var ellipse=match("shape",/^(ellipse)/i,0);ellipse&&(ellipse.style=matchDistance()||matchExtentKeyword());return ellipse}();if(radialType)radialType.at=function matchAtPosition(){if(match("position",/^at/,0)){var positioning=matchPositioning();return positioning||error("Missing positioning value"),positioning}}();else{var defaultPosition=matchPositioning();defaultPosition&&(radialType={type:"default-radial",at:defaultPosition})}return radialType}function matchExtentKeyword(){return match("extent-keyword",tokens.extentKeywords,1)}function matchPositioning(){var location=function matchCoordinates(){return{x:matchDistance(),y:matchDistance()}}();if(location.x||location.y)return{type:"position",value:location}}function matchListing(matcher){var captures=matcher(),result=[];if(captures)for(result.push(captures);scan(tokens.comma);)(captures=matcher())?result.push(captures):error("One extra comma");return result}function matchColorStop(){var color=function matchColor(){return function matchHexColor(){return match("hex",tokens.hexColor,1)}()||function matchRGBAColor(){return matchCall(tokens.rgbaColor,(function(){return{type:"rgba",value:matchListing(matchNumber)}}))}()||function matchRGBColor(){return matchCall(tokens.rgbColor,(function(){return{type:"rgb",value:matchListing(matchNumber)}}))}()||function matchLiteralColor(){return match("literal",tokens.literalColor,0)}()}();return color||error("Expected color definition"),color.length=matchDistance(),color}function matchNumber(){return scan(tokens.number)[1]}function matchDistance(){return match("%",tokens.percentageValue,1)||function matchPositionKeyword(){return match("position-keyword",tokens.positionKeywords,1)}()||matchLength()}function matchLength(){return match("px",tokens.pixelValue,1)||match("em",tokens.emValue,1)}function match(type,pattern,captureIndex){var captures=scan(pattern);if(captures)return{type,value:captures[captureIndex]}}function scan(regexp){var captures,blankCaptures;return(blankCaptures=/^[\n\r\t\s]+/.exec(input))&&consume(blankCaptures[0].length),(captures=regexp.exec(input))&&consume(captures[0].length),captures}function consume(size){input=input.substr(size)}return function(code){return input=code.toString(),getAST()}}(),exports.parse=(GradientParser||{}).parse},"./packages/components/node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.esm.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{"use strict";__webpack_require__.d(__webpack_exports__,{YF:()=>useFloating,x7:()=>arrow});var _floating_ui_dom__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__("./node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs"),react__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/react/index.js"),react_dom__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/react-dom/index.js");const arrow=options=>({name:"arrow",options,fn(state){const{element,padding}="function"==typeof options?options(state):options;return element&&function isRef(value){return{}.hasOwnProperty.call(value,"current")}(element)?null!=element.current?(0,_floating_ui_dom__WEBPACK_IMPORTED_MODULE_2__.x7)({element:element.current,padding}).fn(state):{}:element?(0,_floating_ui_dom__WEBPACK_IMPORTED_MODULE_2__.x7)({element,padding}).fn(state):{}}});var index="undefined"!=typeof document?react__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect:react__WEBPACK_IMPORTED_MODULE_0__.useEffect;function deepEqual(a,b){if(a===b)return!0;if(typeof a!=typeof b)return!1;if("function"==typeof a&&a.toString()===b.toString())return!0;let length,i,keys;if(a&&b&&"object"==typeof a){if(Array.isArray(a)){if(length=a.length,length!=b.length)return!1;for(i=length;0!=i--;)if(!deepEqual(a[i],b[i]))return!1;return!0}if(keys=Object.keys(a),length=keys.length,length!==Object.keys(b).length)return!1;for(i=length;0!=i--;)if(!{}.hasOwnProperty.call(b,keys[i]))return!1;for(i=length;0!=i--;){const key=keys[i];if(("_owner"!==key||!a.$$typeof)&&!deepEqual(a[key],b[key]))return!1}return!0}return a!=a&&b!=b}function getDPR(element){if("undefined"==typeof window)return 1;return(element.ownerDocument.defaultView||window).devicePixelRatio||1}function roundByDPR(element,value){const dpr=getDPR(element);return Math.round(value*dpr)/dpr}function useLatestRef(value){const ref=react__WEBPACK_IMPORTED_MODULE_0__.useRef(value);return index((()=>{ref.current=value})),ref}function useFloating(options){void 0===options&&(options={});const{placement="bottom",strategy="absolute",middleware=[],platform,elements:{reference:externalReference,floating:externalFloating}={},transform=!0,whileElementsMounted,open}=options,[data,setData]=react__WEBPACK_IMPORTED_MODULE_0__.useState({x:0,y:0,strategy,placement,middlewareData:{},isPositioned:!1}),[latestMiddleware,setLatestMiddleware]=react__WEBPACK_IMPORTED_MODULE_0__.useState(middleware);deepEqual(latestMiddleware,middleware)||setLatestMiddleware(middleware);const[_reference,_setReference]=react__WEBPACK_IMPORTED_MODULE_0__.useState(null),[_floating,_setFloating]=react__WEBPACK_IMPORTED_MODULE_0__.useState(null),setReference=react__WEBPACK_IMPORTED_MODULE_0__.useCallback((node=>{node!=referenceRef.current&&(referenceRef.current=node,_setReference(node))}),[_setReference]),setFloating=react__WEBPACK_IMPORTED_MODULE_0__.useCallback((node=>{node!==floatingRef.current&&(floatingRef.current=node,_setFloating(node))}),[_setFloating]),referenceEl=externalReference||_reference,floatingEl=externalFloating||_floating,referenceRef=react__WEBPACK_IMPORTED_MODULE_0__.useRef(null),floatingRef=react__WEBPACK_IMPORTED_MODULE_0__.useRef(null),dataRef=react__WEBPACK_IMPORTED_MODULE_0__.useRef(data),whileElementsMountedRef=useLatestRef(whileElementsMounted),platformRef=useLatestRef(platform),update=react__WEBPACK_IMPORTED_MODULE_0__.useCallback((()=>{if(!referenceRef.current||!floatingRef.current)return;const config={placement,strategy,middleware:latestMiddleware};platformRef.current&&(config.platform=platformRef.current),(0,_floating_ui_dom__WEBPACK_IMPORTED_MODULE_2__.oo)(referenceRef.current,floatingRef.current,config).then((data=>{const fullData={...data,isPositioned:!0};isMountedRef.current&&!deepEqual(dataRef.current,fullData)&&(dataRef.current=fullData,react_dom__WEBPACK_IMPORTED_MODULE_1__.flushSync((()=>{setData(fullData)})))}))}),[latestMiddleware,placement,strategy,platformRef]);index((()=>{!1===open&&dataRef.current.isPositioned&&(dataRef.current.isPositioned=!1,setData((data=>({...data,isPositioned:!1}))))}),[open]);const isMountedRef=react__WEBPACK_IMPORTED_MODULE_0__.useRef(!1);index((()=>(isMountedRef.current=!0,()=>{isMountedRef.current=!1})),[]),index((()=>{if(referenceEl&&(referenceRef.current=referenceEl),floatingEl&&(floatingRef.current=floatingEl),referenceEl&&floatingEl){if(whileElementsMountedRef.current)return whileElementsMountedRef.current(referenceEl,floatingEl,update);update()}}),[referenceEl,floatingEl,update,whileElementsMountedRef]);const refs=react__WEBPACK_IMPORTED_MODULE_0__.useMemo((()=>({reference:referenceRef,floating:floatingRef,setReference,setFloating})),[setReference,setFloating]),elements=react__WEBPACK_IMPORTED_MODULE_0__.useMemo((()=>({reference:referenceEl,floating:floatingEl})),[referenceEl,floatingEl]),floatingStyles=react__WEBPACK_IMPORTED_MODULE_0__.useMemo((()=>{const initialStyles={position:strategy,left:0,top:0};if(!elements.floating)return initialStyles;const x=roundByDPR(elements.floating,data.x),y=roundByDPR(elements.floating,data.y);return transform?{...initialStyles,transform:"translate("+x+"px, "+y+"px)",...getDPR(elements.floating)>=1.5&&{willChange:"transform"}}:{position:strategy,left:x,top:y}}),[strategy,transform,elements.floating,data.x,data.y]);return react__WEBPACK_IMPORTED_MODULE_0__.useMemo((()=>({...data,update,refs,elements,floatingStyles})),[data,update,refs,elements,floatingStyles])}},"./packages/components/node_modules/framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{"use strict";__webpack_require__.d(__webpack_exports__,{J:()=>useReducedMotion});var react__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/react/index.js"),_index_mjs__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__("./packages/components/node_modules/framer-motion/dist/es/utils/reduced-motion/index.mjs"),_state_mjs__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./packages/components/node_modules/framer-motion/dist/es/utils/reduced-motion/state.mjs");function useReducedMotion(){!_state_mjs__WEBPACK_IMPORTED_MODULE_1__.O.current&&(0,_index_mjs__WEBPACK_IMPORTED_MODULE_2__.A)();const[shouldReduceMotion]=(0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(_state_mjs__WEBPACK_IMPORTED_MODULE_1__.n.current);return shouldReduceMotion}},"./packages/components/src/gradient-picker/stories/index.story.tsx":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{"use strict";__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{Default:()=>Default,MultipleOrigins:()=>MultipleOrigins,WithNoExistingGradients:()=>WithNoExistingGradients,default:()=>__WEBPACK_DEFAULT_EXPORT__});var _wordpress_element__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__("./node_modules/react/index.js"),___WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./packages/components/src/gradient-picker/index.tsx"),react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/react/jsx-runtime.js");const __WEBPACK_DEFAULT_EXPORT__={title:"Components/GradientPicker",component:___WEBPACK_IMPORTED_MODULE_1__.Z,parameters:{sourceLink:"packages/components/src/gradient-picker",controls:{expanded:!0},docs:{canvas:{sourceState:"shown"}},actions:{argTypesRegex:"^on.*"}},argTypes:{value:{control:{type:null}}}},GRADIENTS=[{name:"Vivid cyan blue to vivid purple",gradient:"linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)",slug:"vivid-cyan-blue-to-vivid-purple"},{name:"Light green cyan to vivid green cyan",gradient:"linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)",slug:"light-green-cyan-to-vivid-green-cyan"},{name:"Luminous vivid amber to luminous vivid orange",gradient:"linear-gradient(135deg,rgba(252,185,0,1) 0%,rgba(255,105,0,1) 100%)",slug:"luminous-vivid-amber-to-luminous-vivid-orange"},{name:"Luminous vivid orange to vivid red",gradient:"linear-gradient(135deg,rgba(255,105,0,1) 0%,rgb(207,46,46) 100%)",slug:"luminous-vivid-orange-to-vivid-red"},{name:"Very light gray to cyan bluish gray",gradient:"linear-gradient(135deg,rgb(238,238,238) 0%,rgb(169,184,195) 100%)",slug:"very-light-gray-to-cyan-bluish-gray"},{name:"Cool to warm spectrum",gradient:"linear-gradient(135deg,rgb(74,234,220) 0%,rgb(151,120,209) 20%,rgb(207,42,186) 40%,rgb(238,44,130) 60%,rgb(251,105,98) 80%,rgb(254,248,76) 100%)",slug:"cool-to-warm-spectrum"}],Template=({onChange,...props})=>{const[gradient,setGradient]=(0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(null);return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(___WEBPACK_IMPORTED_MODULE_1__.Z,{...props,value:gradient,onChange:(...changeArgs)=>{setGradient(...changeArgs),onChange?.(...changeArgs)}})};Template.displayName="Template";const Default=Template.bind({});Default.args={gradients:GRADIENTS};const WithNoExistingGradients=Template.bind({});WithNoExistingGradients.args={...Default.args,gradients:[]};const MultipleOrigins=Template.bind({});MultipleOrigins.args={...Default.args,gradients:[{name:"Origin 1",gradients:GRADIENTS},{name:"Origin 2",gradients:GRADIENTS}]},Default.parameters={...Default.parameters,docs:{...Default.parameters?.docs,source:{originalSource:"({\n  onChange,\n  ...props\n}) => {\n  const [gradient, setGradient] = useState<(typeof props)['value']>(null);\n  return <GradientPicker {...props} value={gradient} onChange={(...changeArgs) => {\n    setGradient(...changeArgs);\n    onChange?.(...changeArgs);\n  }} />;\n}",...Default.parameters?.docs?.source}}},WithNoExistingGradients.parameters={...WithNoExistingGradients.parameters,docs:{...WithNoExistingGradients.parameters?.docs,source:{originalSource:"({\n  onChange,\n  ...props\n}) => {\n  const [gradient, setGradient] = useState<(typeof props)['value']>(null);\n  return <GradientPicker {...props} value={gradient} onChange={(...changeArgs) => {\n    setGradient(...changeArgs);\n    onChange?.(...changeArgs);\n  }} />;\n}",...WithNoExistingGradients.parameters?.docs?.source}}},MultipleOrigins.parameters={...MultipleOrigins.parameters,docs:{...MultipleOrigins.parameters?.docs,source:{originalSource:"({\n  onChange,\n  ...props\n}) => {\n  const [gradient, setGradient] = useState<(typeof props)['value']>(null);\n  return <GradientPicker {...props} value={gradient} onChange={(...changeArgs) => {\n    setGradient(...changeArgs);\n    onChange?.(...changeArgs);\n  }} />;\n}",...MultipleOrigins.parameters?.docs?.source}}}}}]);