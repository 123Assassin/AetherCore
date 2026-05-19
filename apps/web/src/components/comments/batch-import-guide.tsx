'use client';

export function BatchImportGuide() {
  return (
    <section aria-label="批量导入说明" className="batch-import-guide">
      <div>
        <h2>批量导入</h2>
        <p>上传 Excel 后先生成预览队列，再按行或整批生成评语。</p>
      </div>

      <ol className="batch-import-guide__steps">
        <li>文件格式：.xlsx 或 .xls</li>
        <li>建议列：昵称、性别、年级、标签、关键词</li>
        <li>生成成功后可导出结果表</li>
      </ol>
    </section>
  );
}
