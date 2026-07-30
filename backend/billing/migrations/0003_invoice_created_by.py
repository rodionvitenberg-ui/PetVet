# Generated manually for P0.1 invoice isolation

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('billing', '0002_catalogitem_created_by_catalogitem_is_global_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_invoices',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Автор счёта',
            ),
        ),
    ]
