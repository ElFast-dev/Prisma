import assert from "node:assert/strict";
import { buildRecommendationDeveloperBrief } from "../js/diagnostics/recommendation-handoff.js";

const report = {
  schema: "prisma-recommendation-diagnostics/v13",
  generatedAt: "2026-10-23T23:44:58.373Z",
  applicationVersion: "prisma-web/2026.10.23-lab-diagnostic.1",
  privacy: { generatedLocally: true, networkTransmission: false, featureLabelsIncluded: false },
  sample: {
    validRatingCount: 351, ratingsWithFeatures: 351, metadataCoverage: 1, catalogEntries: 800,
    collectionCounts: { watched: 351, pending: 435, hidden: 0 },
    ratingDistribution: { "1":1,"2":2,"3":4,"4":8,"5":26,"6":58,"7":95,"8":88,"9":67,"10":2 }
  },
  model: {
    kind: "additive-content-baseline", activeRankingMode: "balanced",
    baselineAverageRating: 7.1709, learnedFeatureCount: 8125,
    featureAggregates: { featureDetails: [{ type:"theme", value:"PRIVATE-FEATURE-LABEL-MUST-NOT-APPEAR" }] }
  },
  evaluation: {
    ratingPrediction: { available:true, sampleCount:351, mae:1.1251, baselineMae:1.1444, relativeImprovementPct:1.68,
      withDecadeMae:1.1251, withoutDecadeMae:1.1249 },
    ridgeExperiment: {
      available:true, foldsEvaluated:5, mae:0.9214, baselineMaeSameFolds:1.126,
      deltaBaselineMinusRidge:0.2046, alphaGrid:[0.001,0.003,0.01,0.03,0.1,0.3,1,3,10,100],
      selectedAlphaCounts:{"0.001":5},
      repeatedValidation: {
        available:true, sampleCount:351, repeats:3, foldsPerRepeat:5, foldsEvaluated:15, innerFolds:3,
        alphaGrid:[0.001,0.003,0.01,0.03,0.1,0.3,1,3,10,100],
        selectedAlphaCounts:{"0.001":15}, mae:0.9148, baselineMaeSameFolds:1.1278,
        deltaBaselineMinusRidge:0.213,
        foldStability:{available:true,foldsEvaluated:15,ridgeMaeWins:15,ties:0,baselineMaeWins:0},
        rankingQuality: {
          available:true, sampleCount:351, relevantRatingsCount:252, foldsEvaluated:15, relevantRatingThreshold:7,
          modes:[
            {mode:"balanced",available:true,baselineNdcgAt5:0.8376,ridgeNdcgAt5:0.7884,hybridNdcgAt5:0.7927,
              deltaRidgeMinusBaseline:-0.0492,deltaHybridMinusBaseline:-0.0449,foldsRidgeWins:4,foldsRidgeTies:0,foldsRidgeLosses:11,
              foldsHybridWins:4,foldsHybridTies:0,foldsHybridLosses:11},
            {mode:"affinity",available:true,baselineNdcgAt5:0.825,ridgeNdcgAt5:0.7937,hybridNdcgAt5:0.7968,
              deltaRidgeMinusBaseline:-0.0313,deltaHybridMinusBaseline:-0.0282,foldsRidgeWins:5,foldsRidgeTies:0,foldsRidgeLosses:10,
              foldsHybridWins:5,foldsHybridTies:0,foldsHybridLosses:10},
            {mode:"variety",available:true,baselineNdcgAt5:0.7409,ridgeNdcgAt5:0.774,hybridNdcgAt5:0.7812,
              deltaRidgeMinusBaseline:0.0331,deltaHybridMinusBaseline:0.0403,foldsRidgeWins:10,foldsRidgeTies:0,foldsRidgeLosses:5,
              foldsHybridWins:11,foldsHybridTies:0,foldsHybridLosses:4}
          ]
        }
      },
      alphaSelectionComparison: {
        available:true,
        selectedAlphaCountsByMae:{"0.001":15},
        selectedAlphaCountsByRanking:{"1":3,"3":2,"10":5,"100":2,"0.03":1,"0.3":2},
        maeSelected:{available:true,mae:0.9148},rankingSelected:{available:true,mae:0.9354},
        rankingModes:[
          {mode:"balanced",available:true,maeSelectedNdcgAt5:0.7884,rankingSelectedNdcgAt5:0.7952,deltaRankingSelectionMinusMaeSelection:0.0068},
          {mode:"affinity",available:true,maeSelectedNdcgAt5:0.7937,rankingSelectedNdcgAt5:0.7949,deltaRankingSelectionMinusMaeSelection:0.0012},
          {mode:"variety",available:true,maeSelectedNdcgAt5:0.774,rankingSelectedNdcgAt5:0.7794,deltaRankingSelectionMinusMaeSelection:0.0053}
        ]
      }
    },
    temporalRidgeExperiment: {
      available:true,sampleCount:351,explicitDateCount:351,unverifiedDateCount:0,windowsEvaluated:5,
      dateProvenanceStatus:"explicit",dateSourceMode:"watchedAt-only",mae:1.1769,baselineMaeSameWindows:1.2882,deltaBaselineMinusRidge:0.1113,
      rankingQuality:{available:true,relevantRatingThreshold:7,sampleCount:160,foldsEvaluated:5,modes:[
        {mode:"balanced",available:true,ridgeNdcgAt5:0.7729,deltaRidgeMinusBaseline:0.0833,foldsRidgeWins:4,foldsRidgeTies:0,foldsRidgeLosses:1}
      ]}
    },
    influenceNormalizationExperiment: {
      available:true,foldsEvaluated:5,methods:[
        {method:"mean",available:true,mae:1.1253,deltaMaeVsMean:0},
        {method:"coverage-sqrt",available:true,mae:1.1217,deltaMaeVsMean:0.0036,
          maeFoldStability:{available:true,variantWins:5,ties:0,meanWins:0}},
        {method:"matched-only",available:true,mae:1.117,deltaMaeVsMean:0.0083,
          maeFoldStability:{available:true,variantWins:5,ties:0,meanWins:0}}
      ]
    },
    candidateAvailability:[
      {mode:"balanced",eligibleCandidatePool:7,returnedResultCount:4,requestedResultLimit:5,shortfallReason:"ranking-policy-shortfall"}
    ]
  },
  diagnostic: {
    status:"completed",
    run:{status:"completed",completedPhases:7,totalPhases:7,durationMs:140313,sampleCount:351,phases:[
      {id:"coverage",status:"completed"},{id:"baseline",status:"completed"},{id:"ranking",status:"completed"},
      {id:"normalization",status:"completed"},{id:"ridge",status:"completed"},{id:"temporal",status:"completed"},
      {id:"featureFamilies",status:"completed"}
    ]},
    coverage:{supportDistribution:{once:5890,twoToFour:1776,fiveToNine:340,tenOrMore:119}},
    featureFamilyComparison:{
      available:true,sampleCount:351,repeats:3,foldsEvaluated:15,sharedPartition:true,trainingLeakageChecked:true,
      families:[
        {id:"genres-only",label:"Solo géneros",available:true,mae:1.11066,deltaMaeVsGenres:0,
          rankingByThreshold:{"7":[{mode:"balanced",available:true,ndcgAt5:0.619,deltaNdcgVsGenres:0}],"9":[]}},
        {id:"genres-tags",label:"Géneros + etiquetas",available:true,mae:1.12348,deltaMaeVsGenres:-0.01282,
          rankingByThreshold:{"7":[{mode:"balanced",available:true,ndcgAt5:0.72,deltaNdcgVsGenres:0.101}],"9":[]}},
        {id:"genres-tags-synopsis",label:"Géneros + etiquetas + sinopsis",available:true,mae:1.12761,deltaMaeVsGenres:-0.01695,
          rankingByThreshold:{"7":[],"9":[]}},
        {id:"full-current",label:"Conjunto completo actual",available:true,mae:1.12528,deltaMaeVsGenres:-0.01462,
          rankingByThreshold:{"7":[],"9":[]}}
      ],
      supportRegularization:{available:true,nestedSelection:{available:true,mae:1.11,deltaMaeVsNoShrinkage:0.002,selectedLambdaCounts:{"2":9,"4":6}}}
    }
  }
};
const brief = buildRecommendationDeveloperBrief(report);
assert.ok(brief.startsWith("# PRISMA — contexto técnico"), "Debe producir un resumen legible, no JSON.");
assert.ok(brief.includes("https://github.com/ElFast-dev/Prisma"));
assert.ok(brief.includes("351 valoraciones válidas"));
assert.ok(brief.includes("MAE 0.9148"));
assert.ok(brief.includes("nDCG@5"));
assert.ok(brief.includes("Mantener el modelo aditivo en producción"));
assert.ok(brief.includes("alpha"));
assert.ok(brief.includes("OpenSpec/SDD"));
assert.ok(brief.length < 9500, "El resumen debe ser corto comparado con el JSON integral.");
assert.equal(brief.includes("PRIVATE-FEATURE-LABEL-MUST-NOT-APPEAR"), false,
  "No debe incluir los nombres concretos de las señales aunque existan en el objeto de diagnóstico.");
assert.equal(brief.includes("tmdbId"), false);
assert.equal(brief.includes("ratingDistribution"), false);
assert.equal(brief.includes("2026-10-23T23:44:58.373Z"), true);
assert.match(brief, /4\/5|4 victorias/);
console.log("Resumen técnico para la IA verificado: contexto, métricas decisivas, conclusiones, límites, siguientes pasos y privacidad.");
