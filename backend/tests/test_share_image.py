from PIL import Image

from services.share_image import render_share_image


def test_render_share_image(tmp_path):
    output = tmp_path / "share.png"
    render_share_image(
        output_path=output,
        score=86,
        position="产品经理",
        mode="综合面",
        dimensions={
            "dimensions": {
                "专业知识": 8,
                "逻辑表达": 7.5,
                "问题解决": 9,
                "沟通能力": 8.5,
                "抗压能力": 7,
            }
        },
        callback_url="https://api.probe.app/api/share/callback/1",
        template="radar",
    )
    assert output.exists()
    with Image.open(output) as image:
        assert image.size == (1080, 1440)
        assert image.format == "PNG"
