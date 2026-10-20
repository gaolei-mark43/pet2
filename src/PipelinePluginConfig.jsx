import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Expand,
  Info,
  X,
} from "lucide-react";
import { petApi } from "./mockPetApi.js";
import { normalizePublishedPlugin } from "./pluginLifecycleModel.js";

const documentedDefinitions = {
  "CLOC 静态代码注释率扫描": {
    category: "测试",
    command: "cloc ${SOURCE} --xml --out=${REPORT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "CLOC 静态代码注释率扫描",
      },
      {
        label: "扫描目录",
        key: "SOURCE",
        type: "输入框",
        required: true,
        defaultValue: "src",
      },
      {
        label: "报告路径",
        key: "REPORT",
        type: "输入框",
        required: true,
        defaultValue: "reports/cloc.xml",
      },
    ],
  },
  "JSCPD 静态代码重复率分析": {
    category: "测试",
    command: "jscpd ${SOURCE} --reporters html --output ${OUTPUT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "JSCPD 静态代码重复率分析",
      },
      {
        label: "扫描目录",
        key: "SOURCE",
        type: "输入框",
        required: true,
        defaultValue: "src",
      },
      {
        label: "输出目录",
        key: "OUTPUT",
        type: "输入框",
        required: true,
        defaultValue: "reports/jscpd",
      },
    ],
  },
  "QAC Test": {
    category: "测试",
    command: "qacli analyze -P ${PROJECT} -o ${OUTPUT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "QAC Test",
      },
      { label: "QAC 工程", key: "PROJECT", type: "输入框", required: true },
      {
        label: "输出目录",
        key: "OUTPUT",
        type: "输入框",
        required: true,
        defaultValue: "reports/qac",
      },
    ],
  },
  "Generate QAC Project": {
    category: "测试",
    command: "qacli create -P ${PROJECT} --source ${SOURCE}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "Generate QAC Project",
      },
      {
        label: "源码目录",
        key: "SOURCE",
        type: "输入框",
        required: true,
        defaultValue: "src",
      },
      {
        label: "工程文件",
        key: "PROJECT",
        type: "输入框",
        required: true,
        defaultValue: "qac/project",
      },
    ],
  },
  Polyspace扫描代码并上传报告: {
    category: "测试",
    command: "polyspace-bug-finder -sources ${SOURCE} -results-dir ${OUTPUT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "Polyspace扫描代码并上传报告",
      },
      { label: "源码目录", key: "SOURCE", type: "输入框", required: true },
      {
        label: "结果目录",
        key: "OUTPUT",
        type: "输入框",
        required: true,
        defaultValue: "reports/polyspace",
      },
      { label: "上传报告", key: "UPLOAD", type: "开关", defaultValue: true },
    ],
  },
  "测试报告展示 静态代码扫描": {
    category: "测试",
    command: "pet report static --file ${REPORT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "测试报告展示 静态代码扫描",
      },
      { label: "报告文件", key: "REPORT", type: "输入框", required: true },
    ],
  },
  SonarQube分析: {
    category: "测试",
    command:
      "sonar-scanner -Dsonar.projectKey=${PROJECT_KEY} -Dsonar.sources=${SOURCE}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "SonarQube分析",
      },
      { label: "项目 Key", key: "PROJECT_KEY", type: "输入框", required: true },
      {
        label: "源码目录",
        key: "SOURCE",
        type: "输入框",
        required: true,
        defaultValue: "src",
      },
      {
        label: "等待质量门禁",
        key: "QUALITY_GATE",
        type: "开关",
        defaultValue: true,
      },
    ],
  },
  Matlab模型生成代码: {
    category: "构建",
    command: 'matlab -batch "${SCRIPT}"',
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "Matlab模型生成代码",
      },
      { label: "模型文件", key: "MODEL", type: "输入框", required: true },
      {
        label: "生成脚本",
        key: "SCRIPT",
        type: "多行文本",
        required: true,
        defaultValue: "slbuild('${MODEL}')",
      },
    ],
  },
  SimulinkCheck插件: {
    category: "测试",
    command: "matlab -batch \"pet_simulink_check('${MODEL}','${REPORT}')\"",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "SimulinkCheck插件",
      },
      { label: "模型文件", key: "MODEL", type: "输入框", required: true },
      {
        label: "报告目录",
        key: "REPORT",
        type: "输入框",
        defaultValue: "reports/simulink-check",
      },
    ],
  },
  SimulinkTest插件: {
    category: "测试",
    command: "matlab -batch \"pet_simulink_test('${MODEL}','${SUITE}')\"",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "SimulinkTest插件",
      },
      { label: "模型文件", key: "MODEL", type: "输入框", required: true },
      { label: "测试套件", key: "SUITE", type: "输入框", required: true },
    ],
  },
  Cybellum: {
    category: "测试",
    command: "pet cybellum scan --firmware ${FIRMWARE}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "Cybellum",
      },
      { label: "固件文件", key: "FIRMWARE", type: "输入框", required: true },
      { label: "等待扫描完成", key: "WAIT", type: "开关", defaultValue: true },
    ],
  },
  收集构建产物: {
    category: "制品",
    command:
      "archiveArtifacts artifacts: '${PATTERN}', fingerprint: ${FINGERPRINT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "收集构建产物",
      },
      {
        label: "文件匹配",
        key: "PATTERN",
        type: "输入框",
        required: true,
        defaultValue: "build/**/*",
      },
      {
        label: "生成指纹",
        key: "FINGERPRINT",
        type: "开关",
        defaultValue: true,
      },
    ],
  },
  初始化工作空间: {
    category: "通用",
    command: "pet workspace init --path ${PATH}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "初始化工作空间",
      },
      {
        label: "工作空间路径",
        key: "PATH",
        type: "输入框",
        required: true,
        defaultValue: ".",
      },
    ],
  },
  内存报告解析: {
    category: "测试",
    command: "pet report memory --file ${REPORT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "内存报告解析",
      },
      { label: "Map 文件", key: "REPORT", type: "输入框", required: true },
    ],
  },
  测试报告解析: {
    category: "测试",
    command: "junit '${REPORTS}'",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "测试报告解析",
      },
      {
        label: "报告匹配",
        key: "REPORTS",
        type: "输入框",
        required: true,
        defaultValue: "reports/**/*.xml",
      },
      { label: "允许空报告", key: "ALLOW_EMPTY", type: "开关" },
    ],
  },
  覆盖率分析: {
    category: "测试",
    command: "pet report coverage --file ${REPORT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "覆盖率分析",
      },
      { label: "覆盖率报告", key: "REPORT", type: "输入框", required: true },
      {
        label: "最低覆盖率",
        key: "THRESHOLD",
        type: "数字",
        defaultValue: "80",
      },
    ],
  },
  TAE: {
    category: "测试",
    command: "pet tae run --plan ${PLAN} --environment ${ENVIRONMENT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "TAE",
      },
      { label: "测试计划", key: "PLAN", type: "输入框", required: true },
      {
        label: "测试环境",
        key: "ENVIRONMENT",
        type: "下拉框",
        required: true,
        options: ["SIL", "HIL", "台架"],
      },
    ],
  },
  生成repo_info: {
    category: "代码管理",
    command: "repo manifest -r -o ${OUTPUT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "生成repo_info",
      },
      {
        label: "输出文件",
        key: "OUTPUT",
        type: "输入框",
        required: true,
        defaultValue: "repo_info.xml",
      },
    ],
  },
  下载制品: {
    category: "制品",
    command:
      "pet artifact download --repository ${REPOSITORY} --path ${PATH} --output ${OUTPUT}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "下载制品",
      },
      {
        label: "制品库",
        key: "REPOSITORY",
        type: "下拉框",
        required: true,
        options: ["release-packages", "snapshot-packages"],
      },
      { label: "制品路径", key: "PATH", type: "输入框", required: true },
      {
        label: "保存目录",
        key: "OUTPUT",
        type: "输入框",
        required: true,
        defaultValue: "downloads",
      },
    ],
  },
  下载构建产物: {
    category: "制品",
    command:
      "pet build-artifact download --pipeline ${PIPELINE} --build ${BUILD} --pattern ${PATTERN}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "下载构建产物",
      },
      { label: "来源流水线", key: "PIPELINE", type: "输入框", required: true },
      {
        label: "构建号",
        key: "BUILD",
        type: "输入框",
        required: true,
        defaultValue: "latest",
      },
      {
        label: "文件匹配",
        key: "PATTERN",
        type: "输入框",
        defaultValue: "**/*",
      },
    ],
  },
};

const builtinDefinitions = {
  ...documentedDefinitions,
  清理工作空间: {
    category: "通用",
    version: "1.0.0",
    description: "执行清理工作空间操作，删除所有文件和目录（包括空目录）",
    command: "cleanWs()",
    controls: [],
  },
  Gitlab代码检出: {
    category: "代码管理",
    command: "git clone --branch ${BRANCH} ${REPOSITORY} ${CHECKOUT_DIR}",
    controls: [
      {
        label: "代码仓库",
        key: "REPOSITORY",
        type: "下拉框",
        required: true,
        options: ["tinycc/tinycc-base/(Gitlab)"],
        defaultValue: "tinycc/tinycc-base/(Gitlab)",
      },
      { label: "仓库路径", key: "REPOSITORY_PATH", type: "多行文本", readonly: true },
      { label: "输入版本号", key: "INPUT_VERSION", type: "开关", defaultValue: true },
      {
        label: "分支",
        key: "BRANCH",
        type: "输入框",
        required: true,
        defaultValue: "",
      },
      {
        label: "存储位置",
        key: "CHECKOUT_DIR",
        type: "输入框",
        maxLength: 50,
      },
      { label: "是否使用submodule", key: "SUBMODULE", type: "开关" },
      { label: "仓库源触发时，检出触发仓库", key: "TRIGGER_REPOSITORY", type: "开关" },
      { label: "只拉取最新版本记录", key: "SHALLOW", type: "开关" },
      { label: "是否修改超时时间", key: "CUSTOM_TIMEOUT", type: "开关" },
    ],
  },
  Tasking编译: {
    category: "构建",
    version: "1.0.0",
    description: "用命令行编译Tasking项目，需输入Tasking工程路径及配置项。\n1.0.0:可指定执行命令",
    command: "tasking-build --version ${TASKING_VERSION} --project ${PROJECT_PATH} --output ${OUTPUT_DIR}",
    controls: [
      {
        label: "Tasking版本",
        key: "TASKING_VERSION",
        type: "下拉框",
        required: true,
        defaultValue: "TASKING_6.3",
        options: ["TASKING_6.3"],
      },
      {
        label: "Tasking工程路径",
        key: "PROJECT_PATH",
        type: "输入框",
        maxLength: 150,
        defaultValue: "./.",
      },
      {
        label: "编译产物输出目录",
        key: "OUTPUT_DIR",
        type: "输入框",
        maxLength: 100,
        defaultValue: "build",
      },
    ],
  },
  Bat命令行: {
    category: "通用",
    version: "0.0.3",
    command: "${PARAMETERS}",
    controls: [
      {
        label: "Bat命令行",
        key: "PARAMETERS",
        type: "多行文本",
        maxLength: 9999,
      },
    ],
  },
  Shell命令行: {
    category: "通用",
    version: "0.0.1",
    description: "执行自定义的Shell命令行",
    command: "${PARAMETERS}",
    controls: [
      {
        label: "代码编辑器",
        key: "PARAMETERS",
        type: "多行文本",
        maxLength: 9999,
      },
    ],
  },
  Groovy命令行: {
    category: "通用",
    version: "0.0.2",
    command: "${PARAMETERS}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "Groovy命令行",
      },
      {
        label: "Groovy 脚本",
        key: "PARAMETERS",
        type: "多行文本",
        required: false,
        defaultValue: "",
      },
    ],
  },
  yocto_setup_build: {
    category: "yocto",
    version: "1.0.1",
    description: "该插件用于配置yocto工程构建时所使用的配置文件(conf)",
    evidence: "observed",
    controls: [
      { label: "machine", key: "MACHINE", type: "输入框", required: true, maxLength: 50, defaultValue: "mockboard1" },
      { label: "distro", key: "DISTRO", type: "输入框", required: true, maxLength: 50, defaultValue: "mockdistr" },
      { label: "build_variant", key: "BUILD_VARIANT", type: "输入框", required: true, maxLength: 50, defaultValue: "mock-build-image" },
    ],
  },
  "[yocto]生成SourceRevision": {
    category: "yocto",
    evidence: "observed",
    controls: [
      { label: "生成所有SourceRevision", key: "ALL_SOURCE_REVISIONS", type: "单选", defaultValue: true },
      { label: "指定生成SourceRevision", key: "SOURCE_REVISIONS", type: "多选", defaultValue: [] },
    ],
  },
  "[yocto]收集SourceRevision": {
    category: "yocto",
    evidence: "observed",
    controls: [
      { label: "SourceRevision不存在时自动生成最新", key: "AUTO_GENERATE_LATEST", type: "开关", defaultValue: false },
      { label: "收集SourceRevision", key: "COLLECT_SOURCE_REVISIONS", type: "多选", required: true, defaultValue: [] },
    ],
  },
  "[yocto]上传SourceRevision": {
    category: "yocto",
    evidence: "observed",
    controls: [
      { label: "CONF仓库地址", key: "CONF_REPOSITORY", type: "输入框", required: true, maxLength: 200, defaultValue: "" },
      { label: "CONF上传凭证", key: "CONF_CREDENTIAL", type: "下拉框", required: true, options: [] },
      { label: "CONF仓库分支", key: "CONF_BRANCH", type: "下拉框", required: true, options: [] },
    ],
  },
  上传CodeBeamer报告: {
    category: "通用",
    version: "1.0.2",
    evidence: "observed",
    controls: [
      { label: "Codebeamer Item", key: "CODEBEAMER_ITEM", type: "输入框", maxLength: 500, defaultValue: "" },
      { label: "Codebeamer item 字段名称", key: "ITEM_FIELD_NAME", type: "输入框", maxLength: 50, defaultValue: "" },
      { label: "上传报告路径", key: "REPORT_PATH", type: "输入框", maxLength: 2000, defaultValue: "" },
      { label: "是否切换item状态", key: "CHANGE_ITEM_STATUS", type: "单选", defaultValue: "0" },
      { label: "Codebeamer Item状态ID", key: "ITEM_STATUS_ID", type: "输入框", maxLength: 500, defaultValue: "" },
      { label: "Codebeamer Item状态名称", key: "ITEM_STATUS_NAME", type: "输入框", maxLength: 500, defaultValue: "" },
    ],
  },
  "[蒲公英制品库]上传制品": {
    category: "通用",
    version: "0.0.1",
    description: "python3开发的脚本，需要安装requests和requests_toolbelt库",
    evidence: "observed",
    controls: [
      { label: "API KEY", key: "API_KEY", type: "输入框", required: true, maxLength: 100, defaultValue: "" },
      { label: "APP路径", key: "APP_PATH", type: "输入框", required: true, maxLength: 200, defaultValue: "./" },
    ],
  },
  上传制品: {
    category: "制品",
    command: "pet artifact upload ${PATH}",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "上传制品",
      },
      {
        label: "文件或目录",
        key: "PATH",
        type: "输入框",
        required: true,
        defaultValue: "build/",
      },
      {
        label: "制品库",
        key: "REPOSITORY",
        type: "下拉框",
        required: true,
        options: ["release-packages", "snapshot-packages"],
      },
      {
        label: "版本",
        key: "VERSION",
        type: "输入框",
        required: true,
        defaultValue: "${BUILD_NUMBER}",
      },
    ],
  },
  引用流水线: {
    category: "通用",
    version: "0.0.1",
    command: "pet pipeline trigger --mode ${REFERENCE_MODE} --target ${PIPELINE_NAME}${PIPELINE_LABEL} --parameters '${BUILD_PARAMETERS}'",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "引用流水线",
      },
      {
        label: "引用方式",
        key: "REFERENCE_MODE",
        type: "下拉框",
        required: true,
        options: ["通过流水线名称引用", "通过流水线标签引用"],
        defaultValue: "通过流水线名称引用",
      },
      {
        label: "流水线名称",
        key: "PIPELINE_NAME",
        type: "下拉框",
        options: ["nightly-test", "build-trigger", "code_check"],
      },
      {
        label: "流水线标签",
        key: "PIPELINE_LABEL",
        type: "下拉框",
        options: ["nightly", "release", "test"],
      },
      {
        label: "同步构建参数",
        key: "BUILD_PARAMETERS",
        type: "多行文本",
        defaultValue: "",
      },
    ],
  },
  邮件通知: {
    category: "通知",
    command: "pet notify --to ${RECIPIENTS} --subject '${SUBJECT}'",
    controls: [
      {
        label: "步骤名称",
        key: "STEP_NAME",
        type: "输入框",
        required: true,
        defaultValue: "邮件通知",
      },
      { label: "收件人", key: "RECIPIENTS", type: "输入框", required: true },
      {
        label: "主题",
        key: "SUBJECT",
        type: "输入框",
        required: true,
        defaultValue: "${JOB_NAME} #${BUILD_NUMBER} 构建结果",
      },
      {
        label: "附加构建日志",
        key: "ATTACH_LOG",
        type: "开关",
        defaultValue: true,
      },
    ],
  },
};

export function PipelinePluginConfig({
  plugin,
  initialConfig,
  onBack,
  onClose,
  onSave,
}) {
  const [definition, setDefinition] = useState(null);
  const [form, setForm] = useState(initialConfig?.form || {});
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [outputsOpen, setOutputsOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(initialConfig?.definition?.version || "0.0.2");
  const [expanded, setExpanded] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);
  const [sourceSelectOpen, setSourceSelectOpen] = useState(false);
  const [uploadSelectOpen, setUploadSelectOpen] = useState("");
  const [uploadErrors, setUploadErrors] = useState([]);

  useEffect(() => {
    petApi.snapshot().then((db) => {
      const foundRaw =
        db.plugins.find((x) => x.name === plugin) ||
        db.composites.find((x) => x.name === plugin);
      const found = foundRaw ? normalizePublishedPlugin(foundRaw) : null;
      const builtin = builtinDefinitions[plugin];
      const nextDefinition = {
        ...found,
        ...initialConfig?.definition,
        ...builtin,
        name: plugin,
      };
      const nextControls = nextDefinition.controls?.length
        ? nextDefinition.controls
        : [
            {
              label: "步骤名称",
              key: "STEP_NAME",
              type: "输入框",
              required: true,
              defaultValue: plugin,
            },
            { label: "执行参数", key: "PARAMETERS", type: "输入框" },
          ];
      setDefinition(nextDefinition);
      setSelectedVersion(initialConfig?.definition?.version || nextDefinition.version || "0.0.2");
      setForm((current) =>
        Object.fromEntries(
          nextControls
            .map((control) => [
              control.key,
              current[control.key] ?? control.defaultValue ?? "",
            ])
            .concat([["FAILURE", current.FAILURE || "终止流水线"], ["POST_STEP", !!current.POST_STEP]]),
        ),
      );
    });
  }, [plugin]);

  if (!definition) return null;
  const composite =
    definition.steps && definition.description && !definition.command;
  const controls = definition.controls?.length
    ? definition.controls
    : [
        {
          label: "步骤名称",
          key: "STEP_NAME",
          type: "输入框",
          required: true,
          defaultValue: plugin,
        },
        { label: "执行参数", key: "PARAMETERS", type: "输入框" },
      ];
  const flow = composite
    ? ["确认复合插件信息", "配置共享参数", "确认内部步骤", "保存配置"]
    : ["插件参数配置"];
  const save = () => {
    const missing = controls.find(
      (control) => control.required && !String(form[control.key] ?? "").trim(),
    );
    if (missing) {
      setError(["yocto_setup_build", "[蒲公英制品库]上传制品"].includes(plugin) ? missing.key : `请填写${missing.label}`);
      return;
    }
    const invalid = controls.find((control) => {
      if (!control.regex || !String(form[control.key] ?? "")) return false;
      try { return !new RegExp(control.regex).test(String(form[control.key])); } catch { return true; }
    });
    if (invalid) {
      setError(invalid.errorMessage || `${invalid.label}格式不正确`);
      return;
    }
    onSave({ plugin, form, definition: ["Groovy命令行", "Bat命令行", "Shell命令行"].includes(plugin) ? { ...definition, version: selectedVersion } : definition });
  };

  const schemaSections = (
    <>
      <button className="plugin-section-bar" onClick={() => setParamsOpen(!paramsOpen)}>{paramsOpen ? <ChevronDown /> : <ChevronRight />} 插件参数 <CircleHelp /></button>
      {paramsOpen && <div className="plugin-schema-table"><table><thead><tr>{["参数名称", "类别", "默认值", "允许为空"].map((name) => <th key={name}>{name}</th>)}</tr></thead><tbody><tr><td colSpan={4}>暂无数据</td></tr></tbody></table></div>}
      <button className="plugin-section-bar" onClick={() => setOutputsOpen(!outputsOpen)}>{outputsOpen ? <ChevronDown /> : <ChevronRight />} 插件输出 <CircleHelp /></button>
      {outputsOpen && <div className="plugin-schema-table"><table><thead><tr><th>输出信息名</th><th>描述</th></tr></thead><tbody><tr><td colSpan={2}>暂无数据</td></tr></tbody></table></div>}
    </>
  );

  if (plugin === "清理工作空间") {
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin observed-simple-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <span className="plugin-version-label">请选择插件版本</span>
            <button className="groovy-version" aria-label="插件版本 V1.0.0">V1.0.0<ChevronDown /></button>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="observed-plugin-description">{definition.description}</div>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          {schemaSections}
          <button className="plugin-section-bar open" onClick={() => setConfigOpen(!configOpen)}>{configOpen ? <ChevronDown /> : <ChevronRight />} 插件配置</button>
          {configOpen && <div className="observed-plugin-form clean-workspace-form"><label className="post-step-check"><input type="checkbox" checked={!!form.POST_STEP} onChange={(event) => setForm({ ...form, POST_STEP: event.target.checked })} />最后总是执行该插件(post步骤) <CircleHelp /></label></div>}
          <footer><button className="blue" onClick={() => onSave({ plugin, form, definition })}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "Gitlab代码检出") {
    const checkoutDir = String(form.CHECKOUT_DIR || "");
    const saveCheckout = () => {
      const missing = ["REPOSITORY", "BRANCH"].find((key) => !String(form[key] || "").trim());
      if (missing) { setError(missing); return; }
      onSave({ plugin, form, definition });
    };
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin observed-simple-plugin gitlab-checkout-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <span className="drawer-header-spacer" />
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          <div className="gitlab-checkout-form">
            <label className="observed-input-row"><span><em>*</em>代码仓库</span><div><select aria-label="代码仓库" className={error === "REPOSITORY" ? "invalid" : ""} value={form.REPOSITORY || ""} onChange={(event) => { setForm({ ...form, REPOSITORY: event.target.value }); setError(""); }}><option value="">请选择代码仓库</option><option>tinycc/tinycc-base/(Gitlab)</option></select>{error === "REPOSITORY" && <p className="field-required-error">请选择代码仓库</p>}</div></label>
            <label className="observed-input-row"><span>仓库路径</span><div><textarea aria-label="仓库路径" disabled value={form.REPOSITORY_PATH || ""} /></div></label>
            <label className="gitlab-check-row"><input type="checkbox" checked={form.INPUT_VERSION !== false} onChange={(event) => setForm({ ...form, INPUT_VERSION: event.target.checked })} />输入版本号 <CircleHelp /></label>
            {form.INPUT_VERSION !== false && <label className="observed-input-row"><span><em>*</em>分支</span><div><input aria-label="分支" placeholder="请输入版本号" className={error === "BRANCH" ? "invalid" : ""} value={form.BRANCH || ""} onChange={(event) => { setForm({ ...form, BRANCH: event.target.value }); setError(""); }} />{error === "BRANCH" && <p className="field-required-error">请输入版本号</p>}</div></label>}
            <label className="observed-input-row"><span>存储位置 <CircleHelp /></span><div><span className="observed-count-input"><input aria-label="存储位置" maxLength={50} value={checkoutDir} onChange={(event) => setForm({ ...form, CHECKOUT_DIR: event.target.value })} /><small>{checkoutDir.length}/50</small></span></div></label>
            {[["SUBMODULE", "是否使用submodule"], ["TRIGGER_REPOSITORY", "仓库源触发时，检出触发仓库"], ["SHALLOW", "只拉取最新的版本记录"], ["CUSTOM_TIMEOUT", "是否修改超时时间"]].map(([key, label]) => <label className="gitlab-check-row" key={key}><input type="checkbox" checked={!!form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />{label} <CircleHelp /></label>)}
          </div>
          <footer><button className="blue" onClick={saveCheckout}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "Tasking编译") {
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin observed-simple-plugin tasking-build-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <span className="plugin-version-label">请选择插件版本</span>
            <button className="groovy-version" aria-label="插件版本 V1.0.0">V1.0.0<ChevronDown /></button>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="observed-plugin-description">{definition.description}</div>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          {schemaSections}
          <button className="plugin-section-bar open" onClick={() => setConfigOpen(!configOpen)}>{configOpen ? <ChevronDown /> : <ChevronRight />} 插件配置</button>
          {configOpen && <div className="observed-plugin-form tasking-build-form">
            <label className="post-step-check"><input type="checkbox" checked={!!form.POST_STEP} onChange={(event) => setForm({ ...form, POST_STEP: event.target.checked })} />最后总是执行该插件(post步骤) <CircleHelp /></label>
            {controls.map((control) => { const value = String(form[control.key] || ""); return <label className="observed-input-row" key={control.key}><span>{control.required && <em>*</em>}{control.label} <CircleHelp /></span><div>{control.type === "下拉框" ? <select aria-label={control.label} value={value} onChange={(event) => setForm({ ...form, [control.key]: event.target.value })}>{control.options.map((item) => <option key={item}>{item}</option>)}</select> : <span className="observed-count-input"><input aria-label={control.label} placeholder="请输入" maxLength={control.maxLength} value={value} onChange={(event) => setForm({ ...form, [control.key]: event.target.value })} /><small>{value.length}/{control.maxLength}</small></span>}</div></label>; })}
          </div>}
          <footer><button className="blue" onClick={save}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (["Groovy命令行", "Bat命令行", "Shell命令行"].includes(plugin)) {
    const script = String(form.PARAMETERS || "");
    const versions = plugin === "Bat命令行" ? ["0.0.3"] : plugin === "Shell命令行" ? ["0.0.1"] : ["0.0.2", "0.0.1"];
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin groovy-plugin-config ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <span className="plugin-version-label">请选择插件版本</span>
            <div className="groovy-version-wrap"><button className="groovy-version" aria-expanded={versionOpen} onClick={() => setVersionOpen(!versionOpen)}>V{selectedVersion}<ChevronDown /></button>{versionOpen && <div className="groovy-version-menu" role="listbox" aria-label="插件版本">{versions.map((version) => <button key={version} role="option" aria-selected={selectedVersion === version} onClick={() => { setSelectedVersion(version); setVersionOpen(false); }}>V{version}</button>)}</div>}</div>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          {plugin === "Shell命令行" && <div className="observed-plugin-description">{definition.description}</div>}
          <div className="drawer-info">
            <Info />
            仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏
          </div>
          <button className="plugin-section-bar" onClick={() => setParamsOpen(!paramsOpen)}>
            {paramsOpen ? <ChevronDown /> : <ChevronRight />} 插件参数 <CircleHelp />
          </button>
          {paramsOpen && <div className="plugin-schema-table"><table><thead><tr>{["参数名称", "类别", "默认值", "允许为空"].map((name) => <th key={name}>{name}</th>)}</tr></thead><tbody><tr><td colSpan={4}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar" onClick={() => setOutputsOpen(!outputsOpen)}>
            {outputsOpen ? <ChevronDown /> : <ChevronRight />} 插件输出 <CircleHelp />
          </button>
          {outputsOpen && <div className="plugin-schema-table"><table><thead><tr><th>输出信息名</th><th>描述</th></tr></thead><tbody><tr><td colSpan={2}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar open" onClick={() => setConfigOpen(!configOpen)}>
            {configOpen ? <ChevronDown /> : <ChevronRight />} 插件配置
          </button>
          {configOpen && <div className="groovy-config-body">
            <label className="post-step-check">
              <input
                type="checkbox"
                checked={!!form.POST_STEP}
                onChange={(event) => setForm({ ...form, POST_STEP: event.target.checked })}
              />
              最后总是执行该插件(post步骤) <CircleHelp />
            </label>
            <label className="groovy-editor-label">{plugin === "Shell命令行" ? "代码编辑器" : plugin}</label>
            <div className="groovy-code-editor">
              <span className="line-number">1</span>
              <textarea
                maxLength={9999}
                aria-label={plugin}
                value={script}
                onChange={(event) => setForm({ ...form, PARAMETERS: event.target.value })}
              />
              <small>{script.length}/9999</small>
            </div>
          </div>}
          <footer><button className="blue" onClick={save}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "上传CodeBeamer报告") {
    const textControls = controls.slice(0, 3);
    const statusControls = controls.slice(4);
    const changeStatus = String(form.CHANGE_ITEM_STATUS ?? "0") === "1";
    const counterInput = (control) => {
      const value = String(form[control.key] || "");
      return <label className="observed-input-row codebeamer-input-row" key={control.key}>
        <span>{control.label}{["CODEBEAMER_ITEM", "REPORT_PATH"].includes(control.key) && <CircleHelp />}</span>
        <div><span className="observed-count-input"><input aria-label={control.label} placeholder="请输入" maxLength={control.maxLength} value={value} onChange={(event) => setForm({ ...form, [control.key]: event.target.value })} /><small>{value.length}/{control.maxLength}</small></span></div>
      </label>;
    };
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin observed-simple-plugin codebeamer-report-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <button className="groovy-version" aria-label="插件版本 V1.0.2">V1.0.2<ChevronDown /></button>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          <button className="plugin-section-bar" onClick={() => setParamsOpen(!paramsOpen)}>{paramsOpen ? <ChevronDown /> : <ChevronRight />} 插件参数 <CircleHelp /></button>
          {paramsOpen && <div className="plugin-schema-table"><table><thead><tr>{["参数名称", "类别", "默认值", "允许为空"].map((name) => <th key={name}>{name}</th>)}</tr></thead><tbody><tr><td colSpan={4}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar" onClick={() => setOutputsOpen(!outputsOpen)}>{outputsOpen ? <ChevronDown /> : <ChevronRight />} 插件输出 <CircleHelp /></button>
          {outputsOpen && <div className="plugin-schema-table"><table><thead><tr><th>输出信息名</th><th>描述</th></tr></thead><tbody><tr><td colSpan={2}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar open" onClick={() => setConfigOpen(!configOpen)}>{configOpen ? <ChevronDown /> : <ChevronRight />} 插件配置</button>
          {configOpen && <div className="observed-plugin-form codebeamer-form">
            <label className="post-step-check"><input type="checkbox" checked={!!form.POST_STEP} onChange={(event) => setForm({ ...form, POST_STEP: event.target.checked })} />最后总是执行该插件(post步骤) <CircleHelp /></label>
            {textControls.map(counterInput)}
            <div className="codebeamer-radio-row"><span>是否切换item状态</span><div role="radiogroup"><label><input type="radio" name="change-item-status" checked={!changeStatus} onChange={() => setForm({ ...form, CHANGE_ITEM_STATUS: "0" })} />不切换</label><label><input type="radio" name="change-item-status" checked={changeStatus} onChange={() => setForm({ ...form, CHANGE_ITEM_STATUS: "1" })} />切换</label></div></div>
            {changeStatus && statusControls.map(counterInput)}
          </div>}
          <footer><button className="blue" onClick={save}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "[蒲公英制品库]上传制品") {
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin observed-simple-plugin pgyer-upload-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <button className="groovy-version" aria-label="插件版本 V0.0.1">V0.0.1<ChevronDown /></button>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="observed-plugin-description">{definition.description}</div>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          <button className="plugin-section-bar" onClick={() => setParamsOpen(!paramsOpen)}>{paramsOpen ? <ChevronDown /> : <ChevronRight />} 插件参数 <CircleHelp /></button>
          {paramsOpen && <div className="plugin-schema-table"><table><thead><tr>{["参数名称", "类别", "默认值", "允许为空"].map((name) => <th key={name}>{name}</th>)}</tr></thead><tbody><tr><td colSpan={4}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar" onClick={() => setOutputsOpen(!outputsOpen)}>{outputsOpen ? <ChevronDown /> : <ChevronRight />} 插件输出 <CircleHelp /></button>
          {outputsOpen && <div className="plugin-schema-table"><table><thead><tr><th>输出信息名</th><th>描述</th></tr></thead><tbody><tr><td colSpan={2}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar open" onClick={() => setConfigOpen(!configOpen)}>{configOpen ? <ChevronDown /> : <ChevronRight />} 插件配置</button>
          {configOpen && <div className="observed-plugin-form pgyer-form">
            <label className="post-step-check"><input type="checkbox" checked={!!form.POST_STEP} onChange={(event) => setForm({ ...form, POST_STEP: event.target.checked })} />最后总是执行该插件(post步骤) <CircleHelp /></label>
            {controls.map((control) => {
              const value = String(form[control.key] || "");
              return <label className="observed-input-row" key={control.key}>
                <span><em>*</em>{control.label}{control.key === "APP_PATH" && <CircleHelp />}</span>
                <div><span className={`observed-count-input ${error === control.key ? "invalid" : ""}`}><input aria-label={control.label} placeholder="请输入" maxLength={control.maxLength} value={value} onChange={(event) => { setForm({ ...form, [control.key]: event.target.value }); if (error === control.key) setError(""); }} /><small>{value.length}/{control.maxLength}</small></span>{error === control.key && <p className="field-required-error">该项为必填项</p>}</div>
              </label>;
            })}
          </div>}
          <footer><button className="blue" onClick={save}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "yocto_setup_build") {
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin observed-simple-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <button className="groovy-version" aria-label="插件版本 V1.0.1">V1.0.1<ChevronDown /></button>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="observed-plugin-description">{definition.description}</div>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          <button className="plugin-section-bar" onClick={() => setParamsOpen(!paramsOpen)}>
            {paramsOpen ? <ChevronDown /> : <ChevronRight />} 插件参数 <CircleHelp />
          </button>
          {paramsOpen && <div className="plugin-schema-table"><table><thead><tr>{["参数名称", "类别", "默认值", "允许为空"].map((name) => <th key={name}>{name}</th>)}</tr></thead><tbody><tr><td colSpan={4}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar" onClick={() => setOutputsOpen(!outputsOpen)}>
            {outputsOpen ? <ChevronDown /> : <ChevronRight />} 插件输出 <CircleHelp />
          </button>
          {outputsOpen && <div className="plugin-schema-table"><table><thead><tr><th>输出信息名</th><th>描述</th></tr></thead><tbody><tr><td colSpan={2}>暂无数据</td></tr></tbody></table></div>}
          <button className="plugin-section-bar open" onClick={() => setConfigOpen(!configOpen)}>
            {configOpen ? <ChevronDown /> : <ChevronRight />} 插件配置
          </button>
          {configOpen && <div className="observed-plugin-form">
            <label className="post-step-check">
              <input type="checkbox" checked={!!form.POST_STEP} onChange={(event) => setForm({ ...form, POST_STEP: event.target.checked })} />
              最后总是执行该插件(post步骤) <CircleHelp />
            </label>
            {controls.map((control) => {
              const value = String(form[control.key] ?? "");
              return <label className="observed-input-row" key={control.key}>
                <span><em>*</em>{control.label}</span>
                <div>
                  <span className="observed-count-input">
                    <input aria-label={control.label} placeholder="请输入" maxLength={control.maxLength} value={value} onChange={(event) => { setForm({ ...form, [control.key]: event.target.value }); if (error === control.key) setError(""); }} />
                    <small>{value.length}/{control.maxLength}</small>
                  </span>
                  {error === control.key && <p className="field-required-error">该项为必填项</p>}
                </div>
              </label>;
            })}
          </div>}
          <footer><button className="blue" onClick={save}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "[yocto]生成SourceRevision") {
    const allSourceRevisions = form.ALL_SOURCE_REVISIONS !== false;
    const selectedSourceRevisions = Array.isArray(form.SOURCE_REVISIONS) ? form.SOURCE_REVISIONS : [];
    const saveSourceRevision = () => {
      if (!allSourceRevisions && selectedSourceRevisions.length === 0) {
        setError("SOURCE_REVISIONS");
        return;
      }
      onSave({ plugin, form: { ...form, ALL_SOURCE_REVISIONS: allSourceRevisions, SOURCE_REVISIONS: selectedSourceRevisions }, definition });
    };
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin source-revision-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          <div className="source-revision-form">
            <div className="source-revision-radios" role="radiogroup">
              <label><input type="radio" name="source-revision-mode" checked={allSourceRevisions} onChange={() => { setForm({ ...form, ALL_SOURCE_REVISIONS: true }); setError(""); }} />生成所有SourceRevision</label>
              <label><input type="radio" name="source-revision-mode" checked={!allSourceRevisions} onChange={() => setForm({ ...form, ALL_SOURCE_REVISIONS: false })} />生成指定SourceRevision</label>
            </div>
            {!allSourceRevisions && <label className="source-revision-specific">
              <span>指定生成SourceRevision</span>
              <div>
                <button type="button" className={error === "SOURCE_REVISIONS" ? "invalid" : ""} aria-expanded={sourceSelectOpen} onClick={() => setSourceSelectOpen(!sourceSelectOpen)}>请选择指定生成SourceRevision<ChevronDown /></button>
                {sourceSelectOpen && <div className="observed-empty-dropdown">暂无数据</div>}
                {error === "SOURCE_REVISIONS" && <p className="field-required-error">请选择指定生成SourceRevision</p>}
              </div>
            </label>}
          </div>
          <footer><button className="blue" onClick={saveSourceRevision}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "[yocto]收集SourceRevision") {
    const collected = Array.isArray(form.COLLECT_SOURCE_REVISIONS) ? form.COLLECT_SOURCE_REVISIONS : [];
    const saveCollection = () => {
      if (collected.length === 0) {
        setError("COLLECT_SOURCE_REVISIONS");
        return;
      }
      onSave({ plugin, form: { ...form, COLLECT_SOURCE_REVISIONS: collected }, definition });
    };
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin source-revision-plugin collect-source-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          <div className="source-revision-form collect-source-form">
            <label className="collect-auto-generate"><input type="checkbox" checked={!!form.AUTO_GENERATE_LATEST} onChange={(event) => setForm({ ...form, AUTO_GENERATE_LATEST: event.target.checked })} />SourceRevision不存在时自动生成最新</label>
            <label className="source-revision-specific">
              <span><em>*</em>收集SourceRevision</span>
              <div>
                <button type="button" className={error === "COLLECT_SOURCE_REVISIONS" ? "invalid" : ""} aria-expanded={sourceSelectOpen} onClick={() => setSourceSelectOpen(!sourceSelectOpen)}>请选择收集SourceRevision<ChevronDown /></button>
                {sourceSelectOpen && <div className="observed-empty-dropdown">暂无数据</div>}
                {error === "COLLECT_SOURCE_REVISIONS" && <p className="field-required-error">请选择收集SourceRevision</p>}
              </div>
            </label>
          </div>
          <footer><button className="blue" onClick={saveCollection}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  if (plugin === "[yocto]上传SourceRevision") {
    const uploadFields = [
      ["CONF_REPOSITORY", "CONF仓库地址", "请输入CONF仓库地址"],
      ["CONF_CREDENTIAL", "CONF上传凭证", "请选择CONF上传凭证"],
      ["CONF_BRANCH", "CONF仓库分支", "请选择CONF仓库分支"],
    ];
    const saveUpload = () => {
      const missing = uploadFields.filter(([key]) => !String(form[key] ?? "").trim()).map(([key]) => key);
      setUploadErrors(missing);
      if (missing.length) return;
      onSave({ plugin, form, definition });
    };
    return (
      <div className="drawer-overlay">
        <aside className={`drawer dynamic-plugin source-revision-plugin upload-source-plugin ${expanded ? "drawer-expanded" : ""}`}>
          <header>
            <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
            <strong>{plugin}</strong>
            <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
            <button aria-label="关闭抽屉" onClick={onClose}><X /></button>
          </header>
          <div className="drawer-info"><Info />仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏</div>
          <div className="upload-source-form">
            {uploadFields.map(([key, label, placeholder], index) => <label className="upload-source-row" key={key}>
              <span><em>*</em>{label}</span>
              <div>
                {index === 0 ? <span className={`observed-count-input ${uploadErrors.includes(key) ? "invalid" : ""}`}>
                  <input aria-label={label} placeholder={placeholder} maxLength={200} value={form[key] || ""} onChange={(event) => { setForm({ ...form, [key]: event.target.value }); setUploadErrors(uploadErrors.filter((item) => item !== key)); }} />
                  <small>{String(form[key] || "").length}/200</small>
                </span> : <>
                  <button type="button" className={uploadErrors.includes(key) ? "invalid" : ""} aria-expanded={uploadSelectOpen === key} onClick={() => setUploadSelectOpen(uploadSelectOpen === key ? "" : key)}>{placeholder}<ChevronDown /></button>
                  {uploadSelectOpen === key && <div className="observed-empty-dropdown">暂无数据</div>}
                </>}
                {uploadErrors.includes(key) && <p className="field-required-error">{placeholder}</p>}
              </div>
            </label>)}
          </div>
          <footer><button className="blue" onClick={saveUpload}>保 存</button></footer>
        </aside>
      </div>
    );
  }

  return (
    <div className="drawer-overlay">
      <aside className={`drawer dynamic-plugin ${expanded ? "drawer-expanded" : ""}`}>
        <header>
          <button aria-label="返回插件列表" onClick={onBack || onClose}><ArrowLeft /></button>
          <strong>{plugin}</strong>
          <button aria-label={expanded ? "退出全屏配置" : "全屏配置"} onClick={() => setExpanded(!expanded)}><Expand /></button>
          <button aria-label="关闭抽屉" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="drawer-info">
          <Info />
          {composite
            ? "复合插件将按定义顺序展开内部步骤，只读属性无法在流水线中修改。"
            : "配置字段来自插件发布版本的控件定义，保存后参与脚本生成与 Mock 执行。"}
        </div>
        <div className="plugin-version-bar">
          <label>
            插件版本：
            <select
              value={definition.version || "0.0.1"}
              onChange={(event) =>
                setDefinition({ ...definition, version: event.target.value })
              }
            >
              {(definition.versionHistory?.length
                ? definition.versionHistory.map((item) => item.version)
                : [definition.version || "0.0.1"]
              ).map((version) => (
                <option key={version}>{version}</option>
              ))}
            </select>
          </label>
          <button onClick={() => setDescriptionOpen(!descriptionOpen)}>
            {descriptionOpen ? "收起" : "展开"}插件说明
          </button>
        </div>
        {descriptionOpen && (
          <div className="plugin-meta-panel">
            {definition.description || "该插件暂无补充说明。"}
          </div>
        )}
        <div className="plugin-meta-accordions">
          <button onClick={() => setParamsOpen(!paramsOpen)}>
            构建参数（{definition.params?.length || 0}）
          </button>
          {paramsOpen && (
            <div className="plugin-meta-panel">
              {(definition.params || []).length
                ? definition.params.map((item) => (
                    <p key={item.name}>
                      <code>{item.name}</code> · {item.type} · 默认值{" "}
                      {item.defaultValue || "-"}
                    </p>
                  ))
                : "无绑定构建参数"}
            </div>
          )}
          <button onClick={() => setOutputsOpen(!outputsOpen)}>
            输出变量（{definition.outputs?.length || 0}）
          </button>
          {outputsOpen && (
            <div className="plugin-meta-panel">
              {(definition.outputs || []).length
                ? definition.outputs.map((item) => (
                    <p key={item.name}>
                      <code>{item.name}</code> ·{" "}
                      {item.description || item.source || "-"}
                    </p>
                  ))
                : "无输出变量"}
            </div>
          )}
        </div>
        {composite && (
          <div className="composite-steps">
            {flow.map((item, index) => (
              <button
                className={
                  index === step ? "active" : index < step ? "done" : ""
                }
                onClick={() => setStep(index)}
                key={item}
              >
                <span>{index + 1}</span>
                {item}
              </button>
            ))}
          </div>
        )}
        <div className="drawer-form">
          {composite && step === 0 ? (
            <div className="composite-summary">
              <Boxes />
              <h2>{definition.name}</h2>
              <p>{definition.description}</p>
              <p>
                版本：{definition.version}　内部步骤：{definition.steps}
              </p>
            </div>
          ) : composite && step === 2 ? (
            <div className="inner-steps">
              {["执行单元测试", "解析测试报告", "覆盖率分析"]
                .slice(0, definition.steps)
                .map((item, index) => (
                  <div key={item}>
                    <b>{index + 1}</b>
                    <span>{item}</span>
                    <em>只读</em>
                  </div>
                ))}
            </div>
          ) : (
            controls
              .filter((control) => {
                if (plugin !== "引用流水线") return true;
                if (control.key === "PIPELINE_NAME")
                  return form.REFERENCE_MODE !== "通过流水线标签引用";
                if (control.key === "PIPELINE_LABEL")
                  return form.REFERENCE_MODE === "通过流水线标签引用";
                return true;
              })
              .map((control) => (
              <label key={control.key}>
                <span>
                  {control.required && <em>*</em>} {control.label}：
                </span>
                {plugin === "引用流水线" && control.key === "BUILD_PARAMETERS" ? (
                  <div className="reference-parameters">
                    <div><b>Key</b><b>Value</b></div>
                    {(form[control.key] || "").split("\n").filter(Boolean).map((line, index) => {
                      const [key, ...rest] = line.split("=");
                      return <div key={`${line}-${index}`}><code>{key}</code><span>{rest.join("=")}</span></div>;
                    })}
                    <textarea
                      value={form[control.key] || ""}
                      placeholder={"每行输入一个参数，例如：\nBRANCH=main\nTYPE=release"}
                      onChange={(event) => setForm({ ...form, [control.key]: event.target.value })}
                    />
                    <small>下游流水线存在构建参数时，通过 Key-Value 同步输入</small>
                  </div>
                ) : control.type === "下拉框" ? (
                  <select
                    value={form[control.key] || ""}
                    onChange={(event) =>
                      setForm({ ...form, [control.key]: event.target.value })
                    }
                  >
                    <option value="">请选择{control.label}</option>
                    {(control.options || ["pet-demo", "main", "release"]).map(
                      (option) => (
                        <option key={option}>{option}</option>
                      ),
                    )}
                  </select>
                ) : ["多选框", "开关"].includes(control.type) ? (
                  <div className="check">
                    <input
                      type="checkbox"
                      checked={!!form[control.key]}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          [control.key]: event.target.checked,
                        })
                      }
                    />
                    启用
                  </div>
                ) : control.type === "多行文本" ? (
                  <textarea
                    disabled={control.readonly}
                    value={form[control.key] || ""}
                    placeholder={control.hint || `请输入${control.label}`}
                    onChange={(event) =>
                      setForm({ ...form, [control.key]: event.target.value })
                    }
                  />
                ) : (
                  <input
                    type={control.type === "数字" ? "number" : "text"}
                    disabled={control.readonly}
                    value={form[control.key] || ""}
                    placeholder={control.hint || `请输入${control.label}`}
                    onChange={(event) =>
                      setForm({ ...form, [control.key]: event.target.value })
                    }
                  />
                )}
              </label>
            ))
          )}
          <label>
            <span>失败处理：</span>
            <select
              value={form.FAILURE || "终止流水线"}
              onChange={(event) =>
                setForm({ ...form, FAILURE: event.target.value })
              }
            >
              <option>终止流水线</option>
              <option>继续执行</option>
              <option>标记不稳定</option>
            </select>
          </label>
          {error && <p className="error">{error}</p>}
        </div>
        <footer>
          {composite && step < 3 ? (
            <button className="blue" onClick={() => setStep(step + 1)}>
              下一步
            </button>
          ) : (
            <button className="blue" onClick={save}>
              保存配置
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
