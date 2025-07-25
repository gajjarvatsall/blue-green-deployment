{{/*
Expand the name of the chart.
*/}}
{{- define "blue-green-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "blue-green-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "blue-green-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "blue-green-app.labels" -}}
helm.sh/chart: {{ include "blue-green-app.chart" . }}
{{ include "blue-green-app.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: blue-green-deployment
{{- end }}

{{/*
Selector labels
*/}}
{{- define "blue-green-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "blue-green-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "blue-green-app.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "blue-green-app.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate deployment strategy annotation
*/}}
{{- define "blue-green-app.deploymentStrategy" -}}
{{- if .Values.blueGreen.enabled }}
blue-green.io/deployment-strategy: "blue-green"
blue-green.io/active-environment: {{ .Values.blueGreen.activeEnvironment }}
{{- else }}
blue-green.io/deployment-strategy: "rolling"
{{- end }}
{{- end }}